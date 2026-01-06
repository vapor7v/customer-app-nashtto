import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

/**
 * SkeletonLoader - A reusable skeleton loading component with shimmer effect
 * 
 * Props:
 * - width: number | string - Width of the skeleton
 * - height: number - Height of the skeleton
 * - borderRadius: number - Border radius (default: 8)
 * - style: object - Additional styles
 * - variant: 'rectangle' | 'circle' - Shape variant
 */
export const SkeletonLoader = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
    variant = 'rectangle',
}) => {
    const shimmerValue = useSharedValue(0);

    useEffect(() => {
        shimmerValue.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            shimmerValue.value,
            [0, 0.5, 1],
            [0.3, 0.7, 0.3]
        );
        return {
            opacity,
        };
    });

    const shapeStyle = variant === 'circle'
        ? { borderRadius: height / 2 }
        : { borderRadius };

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height },
                shapeStyle,
                animatedStyle,
                style,
            ]}
        />
    );
};

/**
 * VendorCardSkeleton - Skeleton for vendor cards
 */
export const VendorCardSkeleton = () => (
    <View style={styles.vendorCard}>
        <SkeletonLoader width={80} height={80} borderRadius={16} />
        <View style={styles.vendorInfo}>
            <SkeletonLoader width="70%" height={18} style={styles.mb8} />
            <SkeletonLoader width="50%" height={14} style={styles.mb8} />
            <SkeletonLoader width="40%" height={12} />
        </View>
    </View>
);

/**
 * CategorySkeleton - Skeleton for category items
 */
export const CategorySkeleton = () => (
    <View style={styles.categoryItem}>
        <SkeletonLoader width={60} height={60} variant="circle" />
        <SkeletonLoader width={60} height={12} style={styles.mt8} />
    </View>
);

/**
 * OfferCardSkeleton - Skeleton for offer cards
 */
export const OfferCardSkeleton = () => (
    <View style={styles.offerCard}>
        <SkeletonLoader width="60%" height={20} style={styles.mb8} />
        <SkeletonLoader width="80%" height={14} />
    </View>
);

/**
 * HomeScreenSkeleton - Full skeleton for home screen
 */
export const HomeScreenSkeleton = () => (
    <View style={styles.container}>
        {/* Offer Card Skeleton */}
        <View style={styles.offerCardLarge}>
            <SkeletonLoader width="50%" height={24} style={styles.mb8} />
            <SkeletonLoader width="80%" height={16} />
        </View>

        {/* Categories Skeleton */}
        <View style={styles.section}>
            <SkeletonLoader width={150} height={20} style={styles.mb16} />
            <View style={styles.categoriesRow}>
                {[1, 2, 3, 4].map((i) => (
                    <CategorySkeleton key={i} />
                ))}
            </View>
        </View>

        {/* Vendors Skeleton */}
        <View style={styles.section}>
            <SkeletonLoader width={180} height={20} style={styles.mb16} />
            {[1, 2, 3].map((i) => (
                <VendorCardSkeleton key={i} />
            ))}
        </View>
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#e2e8f0',
    },
    container: {
        padding: 16,
    },
    vendorCard: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    vendorInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    categoryItem: {
        alignItems: 'center',
        marginRight: 16,
    },
    offerCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginRight: 12,
        width: 140,
    },
    offerCardLarge: {
        backgroundColor: '#dcfce7',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    categoriesRow: {
        flexDirection: 'row',
    },
    mb8: {
        marginBottom: 8,
    },
    mb16: {
        marginBottom: 16,
    },
    mt8: {
        marginTop: 8,
    },
});

export default SkeletonLoader;
