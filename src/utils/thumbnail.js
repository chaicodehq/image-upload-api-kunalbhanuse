import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const THUMBNAILS_DIR = path.join(__dirname, "../../uploads/thumbnails");

export async function generateThumbnail(filename) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

  const inputPath = path.join(UPLOADS_DIR, filename);
  const thumbnailName = `thumb-${filename.replace(/\.\w+$/, ".jpg")}`;
  const outputPath = path.join(THUMBNAILS_DIR, thumbnailName);

  await sharp(inputPath)
    .resize({
      width: 200,
      height: 200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  if (fs.statSync(outputPath).size > fs.statSync(inputPath).size) {
    fs.copyFileSync(inputPath, outputPath);
  }

  return thumbnailName;
}

export async function getImageDimensions(filepath) {
  const metadata = await sharp(filepath).metadata();

  return {
    width: metadata.width,
    height: metadata.height,
  };
}
