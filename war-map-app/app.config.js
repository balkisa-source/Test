// Google sign-in on iOS returns to the app through the "reversed" client ID,
// so it is registered as a URL scheme alongside the app's own.
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const googleScheme = googleClientId ? googleClientId.split('.').reverse().join('.') : null;

module.exports = {
  expo: {
    name: 'War Map',
    slug: 'war-map-2027',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: googleScheme ? ['warmap', googleScheme] : 'warmap',
    splash: { image: './assets/splash-icon.png', resizeMode: 'contain', backgroundColor: '#F2F2F6' },
    ios: {
      bundleIdentifier: 'com.balkisa.warmap',
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription: 'Take progress and proof photos for your War Map.',
        NSPhotoLibraryUsageDescription: 'Add progress photos and screenshots to your War Map.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins: [
      [
        '@kingstinct/react-native-healthkit',
        {
          NSHealthShareUsageDescription:
            'War Map reads your steps, weight, sleep and nutrition to fill in your days automatically.',
          NSHealthUpdateUsageDescription: 'War Map does not write to Apple Health.',
        },
      ],
      'expo-secure-store',
      'expo-web-browser',
      'expo-sharing',
    ],
  },
};
