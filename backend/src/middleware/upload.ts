import multer from 'multer';
import path from 'path';
import { randomBytes } from 'crypto';
import { Request } from 'express';
import { UPLOADS_DIR, ensureUploadsDir } from '../utils/uploads';

ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req: Request, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Use cryptographically random name to prevent collisions and path traversal
    const name = `${randomBytes(16).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
const ALLOWED_MIMETYPES   = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIMETYPES.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo não permitido. Use: jpg, png, webp ou pdf`));
    }
  },
});
