import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

/**
 * Returns the resolved persistent/runtime data directory.
 * Honors DATA_DIR environment variable for cloud persistent disks.
 * On Vercel or read-only serverless environments, safely routes runtime data to os.tmpdir().
 */
export function getStorageDataDir(): string {
  if (process.env.DATA_DIR && process.env.DATA_DIR.trim()) {
    const customDir = path.resolve(process.env.DATA_DIR.trim());
    if (!fs.existsSync(customDir)) {
      try {
        fs.mkdirSync(customDir, { recursive: true });
      } catch (e) {}
    }
    return customDir;
  }

  // Detect Vercel serverless environment
  if (process.env.VERCEL) {
    const serverlessDataDir = path.join(os.tmpdir(), 'ai-assistant', 'data');
    if (!fs.existsSync(serverlessDataDir)) {
      try {
        fs.mkdirSync(serverlessDataDir, { recursive: true });
      } catch (e) {}
    }
    return serverlessDataDir;
  }

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
    const localData = path.join(serverRoot, 'data');
    if (!fs.existsSync(localData)) {
      try {
        fs.mkdirSync(localData, { recursive: true });
      } catch (e) {
        // Read-only filesystem fallback
        const tmpFallback = path.join(os.tmpdir(), 'ai-assistant', 'data');
        if (!fs.existsSync(tmpFallback)) {
          fs.mkdirSync(tmpFallback, { recursive: true });
        }
        return tmpFallback;
      }
    }
    return localData;
  } catch (e) {
    const fallback = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(fallback)) {
      try {
        fs.mkdirSync(fallback, { recursive: true });
      } catch {
        return path.join(os.tmpdir(), 'ai-assistant', 'data');
      }
    }
    return fallback;
  }
}

/**
 * Returns the resolved bundled data directory (for reading static seed/evaluation data).
 */
export function getBundledDataDir(): string {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
    const localData = path.join(serverRoot, 'data');
    if (fs.existsSync(localData)) {
      return localData;
    }
  } catch (e) {}
  const cwdData = path.resolve(process.cwd(), 'server', 'data');
  if (fs.existsSync(cwdData)) {
    return cwdData;
  }
  return path.resolve(process.cwd(), 'data');
}

/**
 * Returns the resolved uploads directory.
 * Honors UPLOADS_DIR environment variable for cloud persistent disks.
 * On Vercel, safely routes file uploads to os.tmpdir().
 */
export function getStorageUploadsDir(): string {
  if (process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.trim()) {
    const customDir = path.resolve(process.env.UPLOADS_DIR.trim());
    if (!fs.existsSync(customDir)) {
      try {
        fs.mkdirSync(customDir, { recursive: true });
      } catch (e) {}
    }
    return customDir;
  }

  // Detect Vercel serverless environment
  if (process.env.VERCEL) {
    const serverlessUploadsDir = path.join(os.tmpdir(), 'ai-assistant', 'uploads');
    if (!fs.existsSync(serverlessUploadsDir)) {
      try {
        fs.mkdirSync(serverlessUploadsDir, { recursive: true });
      } catch (e) {}
    }
    return serverlessUploadsDir;
  }

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
    const localUploads = path.join(serverRoot, 'uploads');
    if (!fs.existsSync(localUploads)) {
      try {
        fs.mkdirSync(localUploads, { recursive: true });
      } catch (e) {
        // Read-only filesystem fallback
        const tmpFallback = path.join(os.tmpdir(), 'ai-assistant', 'uploads');
        if (!fs.existsSync(tmpFallback)) {
          fs.mkdirSync(tmpFallback, { recursive: true });
        }
        return tmpFallback;
      }
    }
    return localUploads;
  } catch (e) {
    const fallback = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(fallback)) {
      try {
        fs.mkdirSync(fallback, { recursive: true });
      } catch {
        return path.join(os.tmpdir(), 'ai-assistant', 'uploads');
      }
    }
    return fallback;
  }
}

/**
 * Resolves the client dist directory if built.
 */
export function getClientDistDir(): string | null {
  const candidateDirs: string[] = [];
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
    candidateDirs.push(path.resolve(serverRoot, '..', 'dist'));
    candidateDirs.push(path.resolve(serverRoot, 'dist'));
  } catch {}
  candidateDirs.push(path.resolve(process.cwd(), 'dist'));
  candidateDirs.push(path.resolve(process.cwd(), '..', 'dist'));

  for (const dir of candidateDirs) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}
