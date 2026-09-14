const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to use built 'main' field instead of 'source' field
// This fixes react-native-screens TabsScreen resolution error
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
