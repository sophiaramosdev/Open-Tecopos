import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import ProductCategory from "../../database/models/productCategory";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import {
    deleteProductCategory,
    editProductCategory,
    findAllProductCategory,
    newProductCategory,
} from "../../controllers/administration/productCategory";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerProductCategory = Router();

//Product Category
routerProductCategory.post(
    "/productcategory",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(ProductCategory),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newProductCategory
);
routerProductCategory.patch(
    "/productcategory/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(ProductCategory),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editProductCategory
);
routerProductCategory.get(
    "/productcategory",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllProductCategory
);
routerProductCategory.delete(
    "/productcategory/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteProductCategory
);

export default routerProductCategory;
