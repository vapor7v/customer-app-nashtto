// MapmyIndia Map Component using native mappls-map-react-native SDK
// Beta version - uses MapplsGL for native map rendering

import MapplsGL from 'mappls-map-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// MapmyIndia API Keys from user's dashboard
const MAPPLS_SDK_KEY = '66e286d0c783c2c94de367177b485cf4';
const MAPPLS_CLIENT_ID = '96dHZVzsAuslxma_gvF5MjrjqzZdTVYtBPY5NwbyDweiaYYYlvzRO31AwKkAZl1V3agx17iJWkVjuOgHzfYysQ==';
const MAPPLS_CLIENT_SECRET = 'lrFxI-iSEg9AUcF-tQMymJYOR8yoSLHj82XgsD0jAjaSZyzDbS5_VaatKmEXhOvZnyn9mGKlZsvA7QUBQG0ZPIuAE2More2m';

// Initialize MapplsGL with credentials
MapplsGL.setMapSDKKey(MAPPLS_SDK_KEY);
MapplsGL.setRestAPIKey(MAPPLS_SDK_KEY);
MapplsGL.setAtlasClientId(MAPPLS_CLIENT_ID);
MapplsGL.setAtlasClientSecret(MAPPLS_CLIENT_SECRET);

/**
 * MapmyIndia Map component using native SDK
 * @param {Object} props
 * @param {Object} props.center - {latitude, longitude} center of map
 * @param {number} props.zoom - Zoom level (1-22)
 * @param {Array} props.markers - Array of {latitude, longitude, title}
 * @param {Object} props.style - Style for the container
 */
const MapmyIndiaMap = ({
    center = { latitude: 19.076, longitude: 72.8777 },
    zoom = 15,
    markers = [],
    style,
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Give SDK time to initialize
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if (error) {
        return (
            <View style={[styles.container, style, styles.errorContainer]}>
                <Text style={styles.errorText}>Map unavailable</Text>
                <Text style={styles.errorSubtext}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#22c55e" />
                    <Text style={styles.loadingText}>Loading map...</Text>
                </View>
            )}
            <MapplsGL.MapView
                style={styles.map}
                onDidFinishLoadingMap={() => setLoading(false)}
                onMapError={(e) => {
                    console.error('[MapmyIndia] Map error:', e);
                    setError('Failed to load map');
                }}
            >
                <MapplsGL.Camera
                    zoomLevel={zoom}
                    centerCoordinate={[center.longitude, center.latitude]}
                    animationMode="flyTo"
                    animationDuration={1000}
                />

                {/* Render markers */}
                {markers.map((marker, index) => (
                    <MapplsGL.PointAnnotation
                        key={`marker-${index}`}
                        id={`marker-${index}`}
                        coordinate={[marker.longitude, marker.latitude]}
                        title={marker.title || ''}
                    >
                        <View style={styles.markerContainer}>
                            <View style={[
                                styles.marker,
                                { backgroundColor: marker.color || '#22c55e' }
                            ]} />
                        </View>
                        {marker.title && (
                            <MapplsGL.Callout title={marker.title} />
                        )}
                    </MapplsGL.PointAnnotation>
                ))}
            </MapplsGL.MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: '#f0f9ff',
    },
    map: {
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f0f9ff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 12,
        color: '#64748b',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
    },
    errorText: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: '600',
    },
    errorSubtext: {
        fontSize: 12,
        color: '#991b1b',
        marginTop: 4,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    marker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
});

export default MapmyIndiaMap;
