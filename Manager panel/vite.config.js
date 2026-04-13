import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const workerOrigin = env.VITE_MANAGER_API_BASE_URL || 'https://refer-earn-worker.aawuazer.workers.dev'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: workerOrigin,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
