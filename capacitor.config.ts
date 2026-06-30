import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.uzmandiyet.app",
  appName: "UzmanDiyet",
  // Next.js SSR — production URL WebView olarak yüklenir
  webDir: "out",
  server: {
    url: "https://uzmandiyet.com",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
    preferredContentMode: "mobile",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "Default",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
