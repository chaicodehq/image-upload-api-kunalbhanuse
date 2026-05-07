import { Router } from "express";
import {
  uploadImage,
  listImages,
  getImage,
  downloadImage,
  downloadThumbnail,
  deleteImage,
} from "../controllers/image.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { validateObjectId } from "../middlewares/validateObjectId.middleware.js";

const router = Router();

/**
 * POST / → upload image
 */
router.post("/", upload.single("image"), uploadImage);

/**
 * GET / → list images
 */
router.get("/", listImages);

/**
 * GET /:id → get metadata
 */
router.get("/:id", validateObjectId, getImage);

/**
 * GET /:id/download → download original
 */
router.get("/:id/download", validateObjectId, downloadImage);

/**
 * GET /:id/thumbnail → download thumbnail
 */
router.get("/:id/thumbnail", validateObjectId, downloadThumbnail);

/**
 * DELETE /:id → delete image
 */
router.delete("/:id", validateObjectId, deleteImage);

export default router;
