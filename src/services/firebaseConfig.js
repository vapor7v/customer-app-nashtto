// Firebase configuration for Nashtto Customer App
// Using @react-native-firebase which auto-initializes from google-services.json
import auth from '@react-native-firebase/auth';

// Export auth module
// Note: Firebase automatically initializes from google-services.json (Android)
// and GoogleService-Info.plist (iOS) - no manual initialization needed
export { auth };
export default auth;

