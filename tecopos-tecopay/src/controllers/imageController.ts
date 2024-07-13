import { Request, Response } from "express";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import Image from "../database/models/image";
import { blurhashFromURL } from "blurhash-from-url";
import db from "../database/conecction";

export const uploadImage = async (req: Request, res: Response) => {
  const t = await db.transaction();
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "No image file provided.",
      });
    }

    const validImageExtensions = ["png", "jpg", "jpeg", "gif"];
    const ext = file?.originalname?.split(".").pop()?.toLowerCase();
    const url =
      process.env.APP_ENV === "local"
        ? "http://localhost:5002"
        : "https://apidevpay.tecopos.com";

    if (!ext || !validImageExtensions.includes(ext)) {
      return res.status(400).json({
        message:
          "Invalid image file format. Supported formats: PNG, JPG, JPEG, GIF.",
      });
    }

    const today = new Date();
    const uploadDir = path.join(
      __dirname,
      "../../public",
      today.getFullYear().toString(),
      (today.getMonth() + 1).toString()
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${uuidv4()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const imageUrl = `${url}/${today.getFullYear().toString()}/${(
      today.getMonth() + 1
    ).toString()}/${fileName}`;

    const image = await Image.create(
      {
        url: imageUrl,
        description: "Image description",
      },
      { transaction: t }
    );


    if (image) {
      const blurhashData = await blurhashFromURL(image.url);
      if (blurhashData) {
        image.hash = blurhashData.encoded;
        await image.save({ transaction: t });
      }
    }

    await t.commit();

    return res.status(201).json({
      id: image.id,
      url: image.url,
      hash: image.hash,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

//-GET-IMAGE-BY-ID
export const getImageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate imageId
    if (!id) {
      return res.status(400).json({
        message: "Image ID is required.",
      });
    }

    // Find the Image record by ID
    const image = await Image.findByPk(id);

    // Check if the image exists
    if (!image) {
      return res.status(404).json({
        message: "Image not found.",
      });
    }

    const { URL } = require("url");

    // Extract the pathname from the URL
    const imageUrl = new URL(image.url);
    // const imagePath = imageUrl.pathname;
    const imagePath = path.join(
      __dirname,
      "../../../public",
      imageUrl.pathname
    );
    console.log(imagePath);

    // Check if the image file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        message: "Image file not found.",
      });
    }

    return res.status(200).json({
      id: image.id,
      url: image.url,
      hash: image.hash,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
