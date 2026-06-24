import multer from 'multer';
import path from 'path';

// Armazenamento em memória: o buffer é enviado direto ao Supabase Storage
// pelo controller (não tocamos mais o disco efêmero do Render).
const storage = multer.memoryStorage();

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
