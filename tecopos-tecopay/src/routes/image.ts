import { Router } from "express";
import { getImageById, uploadImage } from "../controllers/imageController";

const imageRouter = Router();

imageRouter.post(
  "/",
  uploadImage
);
imageRouter.get(
  "/:id",
  getImageById
);

export default imageRouter;
