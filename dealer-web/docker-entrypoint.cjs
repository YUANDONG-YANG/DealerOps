const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Runtime inject for the landed FE resolver (public/config.json → dist/config.json).
// GATEWAY_PUBLIC_URL wins; VITE_GATEWAY_URL is the local fallback. No hostname baked here.
const gatewayUrl = String(process.env.GATEWAY_PUBLIC_URL || process.env.VITE_GATEWAY_URL || '').trim()
const dest = path.join(__dirname, 'dist', 'config.json')
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, `${JSON.stringify({ gatewayUrl }, null, 2)}\n`)

const child = spawn('npx', ['vite', 'preview', '--host', '0.0.0.0', '--port', '5173'], {
  stdio: 'inherit',
})
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
