import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  root: './client',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  define: {
    'import.meta.env.VITE_COGNITO_USER_POOL_ID': JSON.stringify(process.env.VITE_COGNITO_USER_POOL_ID || ''),
    'import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID': JSON.stringify(process.env.VITE_COGNITO_USER_POOL_CLIENT_ID || ''),
    'import.meta.env.VITE_AWS_REGION': JSON.stringify(process.env.VITE_AWS_REGION || 'us-east-1'),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'https://4kxjn4gjqj.eu-west-2.awsapprunner.com'),
  },
})