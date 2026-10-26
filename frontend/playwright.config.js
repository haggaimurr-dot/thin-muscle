import { defineConfig } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
const database = join(mkdtempSync(join(tmpdir(), 'thin-muscle-e2e-')), 'test.db')
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: '.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001',
      cwd: fileURLToPath(new URL('../backend', import.meta.url)),
      env: { DATABASE_URL: `sqlite:///${database}` },
      url: 'http://127.0.0.1:8001/health',
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:8001' },
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
    },
  ],
})
