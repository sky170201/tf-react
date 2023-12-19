import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import replace from '@rollup/plugin-replace';

// npm install --save-dev @types/node => __dirname

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'src/react'),
      shared: path.resolve(__dirname, 'src/shared'),
      scheduler: path.resolve(__dirname, 'src/scheduler'),
      'react-dom': path.resolve(__dirname, 'src/react-dom'),
      'react-reconciler': path.resolve(__dirname, 'src/react-reconciler'),
      'react-dom-bindings': path.resolve(__dirname, 'src/react-dom-bindings'),
    },
  },
  plugins: [
    react(),
    replace({
      __DEV__: true,
      preventAssignment: true
    })
  ]
})