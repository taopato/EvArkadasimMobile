module.exports = ({ config }) => {
  const expoConfig = config || {};
  const extra = expoConfig.extra || {};
  const plugins = expoConfig.plugins || [];

  return {
    ...expoConfig,
    platforms: ['ios', 'android', 'web'],
    web: {
      ...(expoConfig.web || {}),
      bundler: 'metro',
      favicon: './src/assets/icon.png',
    },
    plugins: [
      ...plugins,
      'expo-web-browser',
      'expo-font',
      'expo-apple-authentication',
      [
        'expo-secure-store',
        {
          configureAndroidBackup: false,
        },
      ],
      '@react-native-community/datetimepicker',
      'expo-status-bar',
      [
        'expo-splash-screen',
        {
          image: './src/assets/mark-navy.png',
          imageWidth: 132,
          resizeMode: 'contain',
          backgroundColor: '#F7F9FC',
          dark: {
            image: './src/assets/mark-white.png',
            backgroundColor: '#12181D',
          },
        },
      ],
      [
        'expo-image-picker',
        {
          cameraPermission: 'Fiş taramak ve profil fotoğrafı çekmek için kameraya erişim gerekir.',
          photosPermission: 'Fiş, dekont veya profil fotoğrafı seçebilmek için galeriye erişim gerekir.',
          microphonePermission: false,
        },
      ],
    ],
    extra: {
      ...extra,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? extra.EXPO_PUBLIC_API_URL,
      GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? extra.GOOGLE_WEB_CLIENT_ID,
      GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? extra.GOOGLE_IOS_CLIENT_ID,
      GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? extra.GOOGLE_ANDROID_CLIENT_ID,
      GOOGLE_EXPO_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? extra.GOOGLE_EXPO_CLIENT_ID,
    },
  };
};
