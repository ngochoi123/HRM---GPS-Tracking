import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ép Vite chỉ dùng đúng 1 bản React duy nhất, trị dứt điểm lỗi Hook của Leaflet
    dedupe: ['react', 'react-dom']
  }
})