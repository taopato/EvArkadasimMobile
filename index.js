import { registerRootComponent } from 'expo';
import App from './App';
import { Colors as LegacyColors } from './src/constants/Colors';

// Global fallback: ensure Colors exists during module evaluation
if (typeof global !== 'undefined' && !global.Colors) {
  // eslint-disable-next-line no-undef
  global.Colors = LegacyColors;
}

registerRootComponent(App);
