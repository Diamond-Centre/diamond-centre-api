import fs from "fs";
import path from "path";
import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { BadRequestError } from "../errors/AppError";
import { Response } from "express";

const router = Router();

const UPLOAD_DIR =
  process.env.UPLOAD_PATH || path.join(process.cwd(), "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export class UploadController {
  uploadImage = async (req: AuthRequest, res: Response): Promise<void> => {
    const { image_base64, mime_type } = req.body as {
      image_base64?: string;
      mime_type?: string;
    };

    if (!image_base64 || typeof image_base64 !== "string") {
      throw new BadRequestError("image_base64 is required");
    }

    const mime = (mime_type || "image/jpeg").toLowerCase();
    const allowed: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = allowed[mime];
    if (!ext) {
      throw new BadRequestError("Unsupported image type (jpeg, png, webp)");
    }

    // Strip data-url prefix if present
    const raw = image_base64.includes(",")
      ? image_base64.split(",").pop()!
      : image_base64;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(raw, "base64");
    } catch {
      throw new BadRequestError("Invalid base64 image");
    }

    if (buffer.length === 0) {
      throw new BadRequestError("Empty image");
    }
    if (buffer.length > 6 * 1024 * 1024) {
      throw new BadRequestError("Image too large (max 6MB)");
    }

    // Vercel (and similar serverless hosts) have an ephemeral / read-only FS.
    // Persist as a data URL so images still work without object storage.
    const serverless =
      process.env.VERCEL === "1" ||
      process.env.UPLOAD_MODE === "data_url" ||
      process.env.UPLOAD_MODE === "inline";

    if (serverless) {
      const url = `data:${mime};base64,${raw}`;
      res.status(201).json({
        url,
        filename: `inline_${Date.now()}.${ext}`,
        size: buffer.length,
        mime_type: mime,
        storage: "data_url",
      });
      return;
    }

    ensureUploadDir();
    const filename = `event_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${filename}`;
    res.status(201).json({
      url,
      filename,
      size: buffer.length,
      mime_type: mime,
      storage: "disk",
    });
  };
}

export const uploadController = new UploadController();

router.post(
  "/image",
  authenticate,
  asyncHandler(uploadController.uploadImage)
);

export default router;
