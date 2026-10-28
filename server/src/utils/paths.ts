import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Returns the resolved persistent data directory.
 * Honors DATA_DIR environment variable for cloud persistent disks (e.g. Render /var/data),
 * falling back to server/data for local development and standard runtime.
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

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
    const localData = path.join(serverRoot, 'data');
    if (!fs.existsSync(localData)) {
      fs.mkdirSync(localData, { recursive: true });
    }
    return localData;
  } catch (e) {
    const fallback = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
    return fallback;
  }
}

/**
 * Returns the resolved uploads directory.
 * Honors UPLOADS_DIR environment variable for cloud persistent disks (e.g. Render /var/data/uploads),
 * falling back to server/uploads for local development.
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

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
    const localUploads = path.join(serverRoot, 'uploads');
    if (!fs.existsSync(localUploads)) {
      fs.mkdirSync(localUploads, { recursive: true });
    }
    return localUploads;
  } catch (e) {
    const fallback = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
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
