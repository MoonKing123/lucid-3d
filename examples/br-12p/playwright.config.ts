import { defineConfig } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

// 绕过代理（防止系统 http_proxy 拦截 localhost 请求）
process.env.NO_PROXY = 'localhost,127.0.0.1';
process.env.no_proxy = 'localhost,127.0.0.1';

const systemChromium = resolve(
  homedir(),
  'Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const executablePath = existsSync(systemChromium) ? systemChromium : undefined;

// 视觉测试用服务端口（独立于生产 8080，避免冲突）
const SERVER_PORT = 18080;
const VITE_PORT = 5174;

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
    baseURL: `http://localhost:${VITE_PORT}`,
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
  webServer: [
    {
      // 游戏服务器（消息中继）
      command: `BR_PORT=${SERVER_PORT} npx vite-node server/index.ts`,
      port: SERVER_PORT,
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      // Vite 前端开发服务器
      command: `npx vite --port ${VITE_PORT}`,
      url: `http://localhost:${VITE_PORT}`,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  snapshotPathTemplate: '{testDir}/baselines/{testName}{ext}',
});
