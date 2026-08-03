import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Library build: the shell ships as built output, never as source (premise 4).
// React stays external — the application owns exactly one copy of it.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'workbench',
      cssFileName: 'workbench',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
  },
})
