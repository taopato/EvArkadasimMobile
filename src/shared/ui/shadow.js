import { Platform } from 'react-native';

// Cross-platform shadow helper
// level: 0 (none), 1 (small), 2 (medium), 3 (large)
export const shadow = (level = 1, color = 'rgba(0,0,0,0.2)') => {
  const presets = {
    0: { offsetY: 0, blur: 0, spread: 0, opacity: 0, elevation: 0 },
    1: { offsetY: 2, blur: 4, spread: 0, opacity: 0.1, elevation: 2 },
    2: { offsetY: 4, blur: 8, spread: 0, opacity: 0.15, elevation: 4 },
    3: { offsetY: 8, blur: 16, spread: 0, opacity: 0.2, elevation: 8 },
  };

  const { offsetY, blur, spread, opacity, elevation } = presets[level] || presets[1];

  if (Platform.OS === 'web') {
    const rgba = (c, o) => c.replace('rgb(', 'rgba(').replace(')', `, ${o})`);
    const boxShadowColor = color.startsWith('rgba') ? color : rgba(color.replace(' ', ''), opacity);
    return {
      boxShadow: `0 ${offsetY}px ${blur}px ${spread}px ${boxShadowColor}`,
    };
  }

  // Native (iOS/Android)
  return {
    elevation,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
  };
};


