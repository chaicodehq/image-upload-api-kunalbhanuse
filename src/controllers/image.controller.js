import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { Image } from "../models/image.model.js";
import { generateThumbnail, getImageDimensions } from "../utils/thumbnail.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const THUMBNAILS_DIR = path.join(__dirname, "../../uploads/thumbnails");

function getFilePath(filename) {
  return path.join(UPLOADS_DIR, filename);
}

function getThumbnailPath(filename) {
  return path.join(THUMBNAILS_DIR, filename);
}

function deleteFileSafe(filepath) {
  try {
    fs.unlinkSync(filepath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function isInvalidId(id) {
  return !mongoose.Types.ObjectId.isValid(id);
}

export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: "No file uploaded" },
      });
    }

    const { filename, originalname, mimetype, size, path: filepath } = req.file;

    const { width, height } = await getImageDimensions(filepath);
    const thumbnailFilename = await generateThumbnail(filename);

    const tags = req.body.tags
      ? req.body.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    const image = await Image.create({
      originalName: originalname,
      filename,
      mimetype,
      size,
      width,
      height,
      thumbnailFilename,
      description: req.body.description || "",
      tags,
    });

    return res.status(201).json(image);
  } catch (error) {
    next(error);
  }
}

export async function listImages(req, res, next) {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      mimetype,
      sortBy = "uploadDate",
      sortOrder = "desc",
    } = req.query;

    page = Number.parseInt(page, 10) || 1;
    limit = Math.min(Number.parseInt(limit, 10) || 10, 50);

    const query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (mimetype) {
      query.mimetype = mimetype;
    }

    const skip = (page - 1) * limit;
    const total = await Image.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const images = await Image.find(query)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit);

    const totalSizeAgg = await Image.aggregate([
      { $match: query },
      { $group: { _id: null, totalSize: { $sum: "$size" } } },
    ]);

    const totalSize = totalSizeAgg[0]?.totalSize || 0;

    return res.status(200).json({
      data: images,
      meta: {
        total,
        page,
        limit,
        pages,
        totalSize,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getImage(req, res, next) {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({
        error: { message: "Invalid image ID" },
      });
    }

    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { message: "Image not found" },
      });
    }

    return res.status(200).json(image);
  } catch (error) {
    next(error);
  }
}

export async function downloadImage(req, res, next) {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({
        error: { message: "Invalid image ID" },
      });
    }

    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { message: "Image not found" },
      });
    }

    const filePath = getFilePath(image.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: { message: "File not found" },
      });
    }

    res.setHeader("Content-Type", image.mimetype);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${image.originalName}"`,
    );

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}

export async function downloadThumbnail(req, res, next) {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({
        error: { message: "Invalid image ID" },
      });
    }

    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { message: "Image not found" },
      });
    }

    const thumbnailPath = getThumbnailPath(image.thumbnailFilename);

    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({
        error: { message: "File not found" },
      });
    }

    res.setHeader("Content-Type", "image/jpeg");

    return res.sendFile(thumbnailPath);
  } catch (error) {
    next(error);
  }
}

export async function deleteImage(req, res, next) {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({
        error: { message: "Invalid image ID" },
      });
    }

    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { message: "Image not found" },
      });
    }

    deleteFileSafe(getFilePath(image.filename));
    deleteFileSafe(getThumbnailPath(image.thumbnailFilename));

    await Image.findByIdAndDelete(req.params.id);

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
}
