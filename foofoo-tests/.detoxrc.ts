import type { DetoxConfig } from "detox/internals";

const config: DetoxConfig = {
  testRunner: {
    args: {
      config: "e2e/jest.config.ts",
      testTimeout: 120000
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "SPECIFY_IOS_BINARY_PATH",
      build: "xcodebuild -workspace SPECIFY_WORKSPACE -scheme SPECIFY_SCHEME -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build"
    },
    "android.debug": {
      type: "android.apk",
      binaryPath: "SPECIFY_ANDROID_BINARY_PATH",
      build: "cd ../foofoo/android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
      reversePorts: [8081]
    }
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 16"
      }
    },
    emulator: {
      type: "android.emulator",
      device: {
        avdName: "Pixel_6_API_34"
      }
    }
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug"
    },
    "android.emu.debug": {
      device: "emulator",
      app: "android.debug"
    }
  }
};

export default config;
