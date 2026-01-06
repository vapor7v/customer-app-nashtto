import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * Gradient presets for different card types
 */
export const GradientPresets = {
    primary: ['#22c55e', '#16a34a'],
    primaryLight: ['#4ade80', '#22c55e'],
    sunset: ['#f97316', '#ea580c'],
    purple: ['#8b5cf6', '#7c3aed'],
    blue: ['#3b82f6', '#2563eb'],
    teal: ['#14b8a6', '#0d9488'],
    pink: ['#ec4899', '#db2777'],
    gold: ['#fbbf24', '#f59e0b'],
    dark: ['#334155', '#1e293b'],
    success: ['#10b981', '#059669'],
};

/**
 * GradientCard - A card with gradient background and optional press animation
 * 
 * Props:
 * - children: React nodes to render inside the card
 * - onPress: Function to call when card is pressed
 * - colors: Array of gradient colors (or use preset prop)
 * - preset: Name of gradient preset from GradientPresets
 * - style: Additional styles for the container
 * - start/end: Gradient direction coordinates
 */
export const GradientCard = ({
    children,
    onPress,
    colors,
    preset = 'primary',
    style,
    start = { x: 0, y: 0 },
    end = { x: 1, y: 1 },
    borderRadius = 16,
}) => {
    const scale = useSharedValue(1);
    const gradientColors = colors || GradientPresets[preset] || GradientPresets.primary;

    const handlePressIn = () => {
        scale.value = withSpring(0.97, {
            damping: 15,
            stiffness: 400,
        });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {
            damping: 15,
            stiffness: 400,
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    if (onPress) {
        return (
            <AnimatedTouchable
                style={[styles.container, animatedStyle, style]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <LinearGradient
                    colors={gradientColors}
                    start={start}
                    end={end}
                    style={[styles.gradient, { borderRadius }]}
                >
                    {children}
                </LinearGradient>
            </AnimatedTouchable>
        );
    }

    return (
        <Animated.View style={[styles.container, animatedStyle, style]}>
            <LinearGradient
                colors={gradientColors}
                start={start}
                end={end}
                style={[styles.gradient, { borderRadius }]}
            >
                {children}
            </LinearGradient>
        </Animated.View>
    );
};

/**
 * OfferBadge - A small gradient badge for offers/promotions
 */
export const OfferBadge = ({ text, preset = 'primary', style }) => {
    const gradientColors = GradientPresets[preset] || GradientPresets.primary;

    return (
        <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.badge, style]}
        >
            <Text style={styles.badgeText}>{text}</Text>
        </LinearGradient>
    );
};

/**
 * GradientButton - A button with gradient background
 */
export const GradientButton = ({
    title,
    onPress,
    colors,
    preset = 'primary',
    style,
    textStyle,
    disabled = false,
}) => {
    const scale = useSharedValue(1);
    const gradientColors = colors || GradientPresets[preset] || GradientPresets.primary;

    const handlePressIn = () => {
        if (!disabled) {
            scale.value = withSpring(0.95, {
                damping: 15,
                stiffness: 400,
            });
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {
            damping: 15,
            stiffness: 400,
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: disabled ? 0.6 : 1,
    }));

    return (
        <AnimatedTouchable
            style={[styles.buttonContainer, animatedStyle, style]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            disabled={disabled}
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
            >
                <Text style={[styles.buttonText, textStyle]}>{title}</Text>
            </LinearGradient>
        </AnimatedTouchable>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    gradient: {
        padding: 20,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    buttonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default GradientCard;
