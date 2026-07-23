import fs from 'fs';
import path from 'path';

const normalizeDir = (value: string) => (path.isAbsolute(value) ? value : path.resolve(process.cwd(), value));

export const resolveUploadsDir = (): string => {
  const fromEnv = process.env.UPLOADS_DIR?.trim();
  if (fromEnv) return normalizeDir(fromEnv);

  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(__dirname, '..', '..', '..'),
  ];

  for (const root of candidates) {
    const publicDir = path.join(root, 'public');
    if (fs.existsSync(publicDir)) return path.join(publicDir, 'uploads');
  }

  return path.join(process.cwd(), 'public', 'uploads');
};
