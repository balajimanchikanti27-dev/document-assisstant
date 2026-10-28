import { spawn } from 'child_process';
import http from 'http';

const BACKEND_PORT = process.env.PORT || 5000;
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/api/health`;

function checkBackendHealth(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';

  let backendProc = null;
  const isRunning = await checkBackendHealth();

  if (isRunning) {
    console.log(`[dev] Backend server already running on http://127.0.0.1:${BACKEND_PORT} (health: OK)`);
  } else {
    console.log(`[dev] Starting backend server (npm --prefix server run dev)...`);
    backendProc = spawn('npm --prefix server run dev', {
      stdio: 'inherit',
      shell: true,
    });

    backendProc.on('error', (err) => {
      console.error('[dev] Failed to start backend:', err.message);
    });
  }

  console.log(`[dev] Starting Vite dev server on port 3000...`);
  const viteProc = spawn(process.execPath, ['./node_modules/vite/bin/vite.js'], {
    stdio: 'inherit',
    shell: false,
  });

  const cleanup = () => {
    if (backendProc && !backendProc.killed) {
      console.log('\n[dev] Stopping backend process...');
      try {
        if (isWindows) {
          spawn('taskkill', ['/pid', backendProc.pid.toString(), '/f', '/t']);
        } else {
          backendProc.kill('SIGTERM');
        }
      } catch {}
    }
    if (viteProc && !viteProc.killed) {
      try {
        if (isWindows) {
          spawn('taskkill', ['/pid', viteProc.pid.toString(), '/f', '/t']);
        } else {
          viteProc.kill('SIGTERM');
        }
      } catch {}
    }
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('exit', cleanup);
}

main().catch((err) => {
  console.error('[dev] Startup error:', err);
  process.exit(1);
});
