import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/SmartControl/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
