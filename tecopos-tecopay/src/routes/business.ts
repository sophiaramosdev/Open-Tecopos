import { Router } from "express";
import {
    all,
    findById,
    
} from "../controllers/business";

const businessRouter = Router();

businessRouter.get("/", all);

businessRouter.get("/:id", findById);



export default businessRouter;