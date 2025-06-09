import fs from 'fs';
import path from 'path';

export function getContentPath(): string {
  const symlinkPath = path.resolve(process.cwd(), 'content/linked-content');
  const fallbackPath = path.resolve(process.cwd(), 'local-projects/content');

  try {
    const stats = fs.lstatSync(symlinkPath);
    if (stats.isSymbolicLink() || stats.isDirectory()) {
      return symlinkPath;
    }
  } catch (err) {
    // Symlink doesn't exist or failed to read
  }

  return fallbackPath;
}