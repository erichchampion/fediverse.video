import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

/**
 * Animated Touchable Component
 * Phase 7: Smooth animations
 * Provides scale animation on press for better feedback
 */

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedTouchableProps extends TouchableOpacityProps {
  scaleValue?: number;
}

export function AnimatedTouchableScale({
  children,
  scaleValue = 0.95,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedTouchableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withSpring(scaleValue, {
      damping: 15,
      stiffness: 300,
    });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    onPressOut?.(e);
  };

  return (
    <AnimatedTouchable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[rest.style, animatedStyle]}
    >
      {children}
    </AnimatedTouchable>
  );
}
