const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for React Native Web
config.resolver.alias = {
  'react-native$': 'react-native-web',
};

// Add support for SVG files
config.resolver.assetExts.push('svg');

module.exports = config;
