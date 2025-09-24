import * as esbuild from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

const isDevelopment = process.env.NODE_ENV === 'development'

// Create directories
mkdirSync('dist/public/assets', { recursive: true })

// Build the React client
await esbuild.build({
  entryPoints: ['client/src/index.tsx'],
  bundle: true,
  outfile: 'dist/public/assets/index.js',
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: !isDevelopment,
  sourcemap: isDevelopment,
  define: {
    'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'production'}"`,
    'import.meta.env.VITE_COGNITO_USER_POOL_ID': `"${process.env.VITE_COGNITO_USER_POOL_ID || ''}"`,
    'import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID': `"${process.env.VITE_COGNITO_USER_POOL_CLIENT_ID || ''}"`,
    'import.meta.env.VITE_AWS_REGION': `"${process.env.VITE_AWS_REGION || 'us-east-1'}"`,
    'import.meta.env.DEV': `${isDevelopment}`,
    'import.meta.env.MODE': `"${isDevelopment ? 'development' : 'production'}"`,
  },
  jsx: 'automatic',
  loader: {
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.svg': 'file',
    '.gif': 'file',
    '.webp': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
  },
  resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
  alias: {
    '@': resolve('client/src'),
    '@shared': resolve('shared'),
  },
})

// Build CSS with Tailwind
await esbuild.build({
  entryPoints: ['client/src/index.css'],
  bundle: true,
  outfile: 'dist/public/assets/index.css',
  loader: { '.css': 'css' },
  minify: !isDevelopment,
})

// Create HTML file
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BNDY Backstage</title>
  <link rel="stylesheet" href="/assets/index.css">
</head>
<body>
  <div id="root"></div>
  <script src="/assets/index.js"></script>
</body>
</html>`

writeFileSync('dist/public/index.html', html)

console.log('✅ Client build completed')