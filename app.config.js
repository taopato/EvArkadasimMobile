const appJson = require('./app.json');

const expoConfig = appJson.expo || {};
const extra = expoConfig.extra || {};

module.exports = () => ({
  ...expoConfig,
  platforms: ['ios', 'android', 'web'],
  web: {
    bundler: 'metro',
    favicon: './src/assets/icon.png',
  },
  extra: {
    ...extra,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? extra.EXPO_PUBLIC_API_URL,
    GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? extra.GOOGLE_WEB_CLIENT_ID,
    GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? extra.GOOGLE_IOS_CLIENT_ID,
    GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? extra.GOOGLE_ANDROID_CLIENT_ID,
    GOOGLE_EXPO_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? extra.GOOGLE_EXPO_CLIENT_ID,
  },
});
