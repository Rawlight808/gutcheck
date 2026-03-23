import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    // Broader Safari / iOS WebKit compatibility (avoid runtime surprises on older devices)
    target: ['es2020', 'safari14'],
  },
})
