import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fluxneis.app',
  appName: 'FluxNeis',
  // O caminho correto encontrado no seu find foi dist/app/browser
  webDir: 'dist/app/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;