module.exports = function (api) {
  const isProduction = api.env('production');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(isProduction ? ['babel-plugin-transform-remove-console'] : []),
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      'react-native-worklets/plugin',
    ],
  };
};
