import { defineConfig } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const systemChromium = resolve(
  homedir(),
  'Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const executablePath = existsSync(systemChromium) ? systemChromium : undefined;

export default defineConfig({
  testDir: './test/visual',
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 200,
      threshold: 0.2,
    },
  },
  use: {
    baseURL: 'http://localhost:5174',
    browserName: 'chromium',
    headless: true,
    launchOptions: {
      executablePath,
      args: [
        '--use-angle=swiftshader',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    },
    viewport: { width: 512, height: 512 },
  },
  webServer: {
    command: 'npx vite --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 15_000,
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testName}{ext}',
});
