import { Router } from "express";

import {
    getDocument,
    getImage,
    uploadDocument,
    uploadImage,
} from "../controllers/files";
import { businessValidator } from "../middlewares/businessValidator";
import { jwtValidator } from "../middlewares/jwtValidator";
import { originValidator } from "../middlewares/originValidator";
import { allowedRoles } from "../middlewares/allowedRoles";

const routerUpload = Router();

//Images
routerUpload.post(
    "/",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_SHOP_ONLINE",
        ]),
    ],
    uploadImage
);

routerUpload.post(
    "/docs",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
    ],
    uploadDocument
);

routerUpload.get(
    "/docs/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
    ],
    getDocument
);

routerUpload.get(
    "/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_AREA",
        ]),
    ],
    getImage
);

export default routerUpload;
