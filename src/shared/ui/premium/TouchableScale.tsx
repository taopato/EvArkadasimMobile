import React, { useRef } from 'react';
import { Pressable, Animated, ViewStyle } from 'react-native';

type TouchableScaleProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  scaleTo?: number;
};

export const TouchableScale: React.FC<TouchableScaleProps> = ({
  children,
  onPress,
  style,
  disabled = false,
  scaleTo = 0.98,
}) => {
  const anim = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(anim, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      style={style as any}
    >
      <Animated.View style={{ transform: [{ scale: anim }] }}>{children}</Animated.View>
    </Pressable>
  );
};


