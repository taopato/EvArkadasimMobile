// src/components/Toast.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../shared/theme/ThemeProvider';

const { width } = Dimensions.get('window');

const Toast = ({ 
  visible, 
  message, 
  type = 'success', 
  duration = 3000, 
  onHide 
}) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onHide && onHide();
    });
  };

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: theme.colors.success?.[600], icon: 'checkmark-circle' };
      case 'error':
        return { backgroundColor: theme.colors.error?.[600], icon: 'close-circle' };
      case 'warning':
        return { backgroundColor: theme.colors.warning?.[600], icon: 'warning' };
      case 'info':
        return { backgroundColor: theme.colors.info?.[600], icon: 'information-circle' };
      default:
        return { backgroundColor: theme.colors.success?.[600], icon: 'checkmark-circle' };
    }
  };

  const toastStyle = getToastStyle();
  const textColor = theme.colors.text?.onPrimary;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: toastStyle.backgroundColor,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={hideToast}
        activeOpacity={0.8}
      >
        <Ionicons name={toastStyle.icon} size={20} color={textColor} style={styles.icon} />
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Ionicons name="close" size={18} color={textColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 12,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Toast;
