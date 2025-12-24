# Delivery Matching — Firebase Design & Code

This document contains a production-ready blueprint and code snippets for a delivery-order broadcasting + rider-accept system using Firebase (Firestore, Cloud Functions, FCM) and Geo queries. It includes:

- Firestore data model
- Security rules (starter)
- Cloud Functions: notify nearby riders, accept order (transactional), revoke/timeout
- Geo query setup with GeoFirestore / GeoFireX guidance
- React Native snippets (Rider & Customer)
- Deployment & testing checklist
- Optional enhancements and scaling notes

---

## 1. High level flow

1. Customer creates order (orders/{orderId}) with `status: "searching_rider"` and `restaurantLocation` (lat,lng).
2. Cloud Function `onOrderCreate` triggers — finds riders within radius using geo-query and notifies them via FCM. It writes a ``broadcast`` subcollection with `notifiedRiderIds` (optional).
3. Rider app receives push and shows an order card (also has real-time listener on searching orders).
4. Rider taps Accept. Rider app calls callable Cloud Function `acceptOrder(orderId)`.
5. `acceptOrder` uses a Firestore transaction to atomically change `status` to `assigned` and sets `assignedRiderId`.
6. Other riders' listeners react to the order status change and remove it from UI. Optionally send cancellation notifications.

---

## 2. Firestore Data Model (recommended)

```
orders/{orderId}
{
  orderId: string,
  customerId: string,
  restaurantLocation: { lat: number, lng: number },
  pickupLocation: { lat, lng },
  dropLocation: { lat, lng },
  items: [ ... ],
  total: number,
  status: "searching_rider" | "assigned" | "picked" | "delivered" | "cancelled",
  assignedRiderId: string | null,
  broadcast: {
    radiusKm: number,
    notified: [riderId],
    createdAt: timestamp
  },
  createdAt: timestamp
}

riders/{riderId}
{
  riderId: string,
  isOnline: boolean,
  lastSeen: timestamp,
  location: geopoint, // use GeoFirestore or store lat/lng
  fcmToken: string,
  rating: number,
  meta: { vehicleType, acceptanceRate }
}

// Optional: logs/acceptAttempts
orders/{orderId}/acceptAttempts/{attemptId}
{
  riderId, time, result: "success"|"rejected"|"timeout"
}
```

Notes:
- Keep `orders` documents small; store large receipts or receipts images in Storage.
- Use `broadcast.notified` to avoid notifying same rider repeatedly as radius expands.

---

## 3. Security Rules (starter)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /orders/{orderId} {
      allow create: if request.auth != null && request.resource.data.customerId == request.auth.uid;
      allow read: if request.auth != null && (
        resource.data.customerId == request.auth.uid ||
        request.auth.token.role == 'rider' // rider role set in custom claims
      );
      allow update: if request.auth != null && (
        request.auth.uid == resource.data.customerId ||
        request.auth.token.role == 'rider'
      );
    }

    match /riders/{riderId} {
      allow read: if request.auth != null && request.auth.token.role == 'admin';
      allow write: if request.auth != null && request.auth.uid == riderId;
    }

  }
}
```

Notes:
- Use Firebase Auth + custom claims to mark riders vs customers.
- For production tighten rules to ensure only Cloud Functions can update `status` fields (via service account). Example: require `request.auth.token.firebase.sign_in_provider == 'custom_token'` or use _admin_ updates via functions.

---

## 4. Geo queries: GeoFireX (recommended for Node + TS)

**Why**: Firestore doesn't do native circular radius queries; GeoFireX or geofirestore provide efficient searches using geohashes.

Install (Node Cloud Functions):
```
npm install geofire-common geofirestore
// or use geofirex for TS projects
```

Example usage (server-side):
```js
const { GeoCollectionReference, GeoFirestore } = require('geofirestore');
const admin = require('firebase-admin');
const geofirestore = new GeoFirestore(admin.firestore());

const ridersGeo = geofirestore.collection('riders');

// center: {latitude, longitude}
async function findNearbyRiders(centerLat, centerLng, radiusKm) {
  const query = ridersGeo.near({ center: new admin.firestore.GeoPoint(centerLat, centerLng), radius: radiusKm });
  const snap = await query.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
```

---

## 5. Cloud Functions (Node.js) — boilerplate

### 5.1 notifyRiders (onCreate)

```js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const { GeoFirestore } = require('geofirestore');
const geofirestore = new GeoFirestore(admin.firestore());

exports.onOrderCreate_notifyRiders = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;
    const { lat, lng } = order.restaurantLocation;

    const ridersColl = geofirestore.collection('riders');
    const radiusKm = order.broadcast?.radiusKm || 3;

    const nearby = await ridersColl.near({ center: new admin.firestore.GeoPoint(lat, lng), radius: radiusKm }).get();

    const tokens = [];
    const notified = [];

    nearby.docs.forEach(doc => {
      const data = doc.data();
      if (data.isOnline && data.fcmToken) {
        tokens.push(data.fcmToken);
        notified.push(doc.id);
      }
    });

    if (tokens.length) {
      const payload = {
        notification: { title: 'New delivery nearby', body: `Order ${orderId} — tap to accept` },
        data: { orderId }
      };

      await admin.messaging().sendToDevice(tokens, payload);
    }

    // update order.broadcast.notified for bookkeeping
    await snap.ref.update({ 'broadcast.notified': notified, 'broadcast.createdAt': admin.firestore.FieldValue.serverTimestamp() });
  });
```

### 5.2 acceptOrder (callable, atomic)

```js
exports.acceptOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const riderId = context.auth.uid;
  const { orderId } = data;
  if (!orderId) throw new functions.https.HttpsError('invalid-argument', 'orderId required');

  const orderRef = admin.firestore().collection('orders').doc(orderId);

  try {
    await admin.firestore().runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) throw new functions.https.HttpsError('not-found', 'Order not found');
      const order = orderSnap.data();
      if (order.status !== 'searching_rider') {
        throw new functions.https.HttpsError('failed-precondition', 'Order already assigned');
      }

      // assign
      tx.update(orderRef, {
        status: 'assigned',
        assignedRiderId: riderId,
        assignedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // optional: write accept attempt
      const attemptRef = orderRef.collection('acceptAttempts').doc();
      tx.set(attemptRef, { riderId, time: admin.firestore.FieldValue.serverTimestamp(), result: 'success' });
    });

    return { success: true };
  } catch (err) {
    // map functions error or rethrow
    throw err;
  }
});
```

### 5.3 Revoke or Timeout (scheduled / watch)

- Use a scheduled Cloud Function to find `orders` stuck in `assigned` but not `picked` in N minutes → move to `searching_rider` and rebroadcast.

---

## 6. React Native snippets

### 6.1 Rider: subscribe to searching orders

```js
// Rider app initializes Firebase and sets geolocation regularly
const ordersQuery = firebase.firestore().collection('orders')
  .where('status', '==', 'searching_rider')
  // optionally filter by time or broadcast.radius
;

ordersQuery.onSnapshot(snapshot => {
  const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  // optionally compute distance locally and filter
  setNearbyOrders(orders);
});

// Accept
const accept = firebase.functions().httpsCallable('acceptOrder');
await accept({ orderId });
```

### 6.2 Customer: create order

```js
const order = {
  customerId: auth.currentUser.uid,
  restaurantLocation: new firebase.firestore.GeoPoint(lat, lng),
  dropLocation: new firebase.firestore.GeoPoint(destLat, destLng),
  status: 'searching_rider',
  broadcast: { radiusKm: 3 }
};

const ref = await firebase.firestore().collection('orders').add(order);
```

### 6.3 Push handling

- Use FCM listener to open order details.
- When a rider accepts, UI updates because of Firestore listener.

---

## 7. Deployment & Dev checklist

- [ ] Setup Firebase project and enable Firestore in Native mode
- [ ] Configure Firebase Auth and create roles via custom claims for riders
- [ ] Deploy Cloud Functions (Node 18+ runtime recommended)
- [ ] Add geohash fields / use GeoFireX
- [ ] Add indexes for queries
- [ ] Add tests: concurrency (simulate multiple accept calls)
- [ ] Monitor logs and set alerts

---

## 8. Scaling & Performance notes

- Geo queries are the heavy part — use region-based partitioning if you have large rider counts.
- Limit how many riders you notify at once (top N nearest) to avoid FCM quota spikes.
- Use short TTLs and incremental radius expansion to limit blasts.
- Use in-memory queues or Redis (outside Firebase) if you need ultra-low latency matching at scale.

---

## 9. Optional advanced features

- Weighted ranking for riders: availability, rating, estimated time to pickup.
- Multi-stage broadcast: notify 5 nearest, wait 10s, if none accepts, notify next 10.
- Predictive pre-warm: keep a small set of riders pre-notified during peak.
- Handoff: if assigned rider fails to pick up, mark and re-broadcast.

---

## 10. Testing scenarios

1. Multiple riders try to accept simultaneously — ensure only one succeeds.
2. No riders online — ensure system expands radius and tries again.
3. Assigned rider times out — ensure re-broadcast.
4. Rider app offline but receives FCM later — ensure idempotency and checks on accept.

---

# Appendix: Useful Links
- GeoFirestore / GeoFireX docs (search online)
- Firebase Transactions & Callable Functions docs




