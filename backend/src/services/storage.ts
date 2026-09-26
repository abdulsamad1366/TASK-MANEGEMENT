import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { supabase } from '../config/supabase';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

export const processUploadedFile = async (
  file: Express.Multer.File,
  bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'attachments'
): Promise<{ fileUrl: string; fileName: string; fileSize: number; fileType: string }> => {
  // If Supabase Storage is configured, attempt upload
  if (supabase) {
    try {
      const fileBuffer = fs.readFileSync(file.path);
      const filePath = `${Date.now()}-${file.filename}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(data.path);

        return {
          fileUrl: publicUrlData.publicUrl,
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
        };
      }
    } catch (supabaseError) {
      console.warn('Supabase storage upload failed, falling back to local file path:', supabaseError);
    }
  }

  // Fallback to local server static URL
  const fileUrl = `/uploads/${file.filename}`;
  return {
    fileUrl,
    fileName: file.originalname,
    fileSize: file.size,
    fileType: file.mimetype,
  };
};
