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
      '@react-native-community/datetimepicker',
      [
        'expo-image-picker',
        {
          cameraPermission: 'Fiş taramak ve harcama/ödeme kanıtı eklemek için kameraya erişim gerekir.',
          photosPermission: 'Fiş veya dekont fotoğrafı seçebilmek için galeriye erişim gerekir.',
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
