import { defineConfig } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

// 复用根项目已安装的 Chromium（SwiftShader CPU 渲染，保证确定性）
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
    },
  },
  use: {
    baseURL: 'http://localhost:5173',
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
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 15_000,
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testName}{ext}',
});
