import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * AnimatedCard - A card component with press and mount animations
 * 
 * Props:
 * - children: React nodes to render inside the card
 * - onPress: Function to call when card is pressed
 * - style: Additional styles for the card container
 * - delay: Delay before fade-in animation (for staggered lists)
 * - enablePressAnimation: Whether to enable scale on press (default: true)
 * - enableFadeIn: Whether to enable fade-in on mount (default: true)
 */
export const AnimatedCard = ({
    children,
    onPress,
    style,
    delay = 0,
    enablePressAnimation = true,
    enableFadeIn = true,
}) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(enableFadeIn ? 0 : 1);
    const translateY = useSharedValue(enableFadeIn ? 20 : 0);

    useEffect(() => {
        if (enableFadeIn) {
            const timeout = setTimeout(() => {
                opacity.value = withTiming(1, { duration: 400 });
                translateY.value = withSpring(0, {
                    damping: 15,
                    stiffness: 100,
                });
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [delay, enableFadeIn]);

    const handlePressIn = () => {
        if (enablePressAnimation) {
            scale.value = withSpring(0.97, {
                damping: 15,
                stiffness: 400,
            });
        }
    };

    const handlePressOut = () => {
        if (enablePressAnimation) {
            scale.value = withSpring(1, {
                damping: 15,
                stiffness: 400,
            });
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
    }));

    const CardComponent = onPress ? AnimatedTouchable : Animated.View;

    return (
        <CardComponent
            style={[styles.card, animatedStyle, style]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
        >
            {children}
        </CardComponent>
    );
};

/**
 * FadeInView - Simple fade-in wrapper for any content
 */
export const FadeInView = ({ children, delay = 0, style }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(15);

    useEffect(() => {
        const timeout = setTimeout(() => {
            opacity.value = withTiming(1, { duration: 500 });
            translateY.value = withSpring(0, {
                damping: 20,
                stiffness: 90,
            });
        }, delay);
        return () => clearTimeout(timeout);
    }, [delay]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

/**
 * ScaleOnPress - Wrapper that adds scale animation on press
 */
export const ScaleOnPress = ({ children, onPress, style, scaleValue = 0.95 }) => {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(scaleValue, {
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

    return (
        <AnimatedTouchable
            style={[animatedStyle, style]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
        >
            {children}
        </AnimatedTouchable>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
});

export default AnimatedCard;
