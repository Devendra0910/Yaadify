import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.memomart.app",
  appName: "6 Senses",
  webDir: "dist",
  backgroundColor: "#0e1f14",
  android: {
    allowMixedContent: false,
  },
};

export default config;
