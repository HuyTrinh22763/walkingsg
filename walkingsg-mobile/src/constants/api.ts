import { Platform, NativeModules } from 'react-native';

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};

const getDevHostIp = (): string => {
  if (Platform.OS === 'web') {
    return 'localhost';
  }

  // NativeModules.SourceCode?.scriptURL contains the Metro bundler IP (e.g. http://192.168.1.X:8081/index.bundle)
  const scriptUrl = NativeModules?.SourceCode?.scriptURL;
  if (scriptUrl) {
    const address = scriptUrl.split('://')[1]?.split('/')[0];
    const host = address?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  return 'localhost';
};

export const IS_DEV =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${getDevHostIp()}:3052/v1/api`;
