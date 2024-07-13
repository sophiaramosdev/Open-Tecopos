import { Router } from "express";
import { testNotification } from "../controllers/firebase";

const firebaseRouter = Router();

firebaseRouter.post("/notification", testNotification);

export default firebaseRouter;