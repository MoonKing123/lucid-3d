import { defineConfig } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

process.env.NO_PROXY = 'localhost,127.0.0.1';
process.env.no_proxy = 'localhost,127.0.0.1';

const systemChromium = resolve(
  homedir(),
  'Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const executablePath = existsSync(systemChromium) ? systemChromium : undefined;

export default defineConfig({
  testDir: './test/visual',
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
    },
  },
  use: {
    baseURL: 'http://localhost:5176',
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
    viewport: { width: 800, height: 600 },
  },
  webServer: {
    command: 'npx vite --port 5176',
    url: 'http://localhost:5176',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  snapshotPathTemplate: '{testDir}/baselines/{testName}{ext}',
});
