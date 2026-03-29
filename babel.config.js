module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }],
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      'react-native-worklets/plugin',
    ],
  };
};
