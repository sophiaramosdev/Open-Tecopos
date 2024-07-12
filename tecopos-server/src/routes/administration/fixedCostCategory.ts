import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import { allowedRoles } from "../../middlewares/allowedRoles";
import FixedCostCategory from "../../database/models/fixedCostCategory";
import {
    deleteFixedCostCategory,
    editFixedCostCategory,
    findAllFixedCostCategories,
    newFixedCostCategory,
} from "../../controllers/administration/fixedCostCategory";

const routerFixedCostCategory = Router();

//Product Category
routerFixedCostCategory.post(
    "/",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(FixedCostCategory),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_CONTABILITY"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newFixedCostCategory
);
routerFixedCostCategory.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(FixedCostCategory),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_CONTABILITY"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editFixedCostCategory
);
routerFixedCostCategory.get(
    "/",
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
    findAllFixedCostCategories
);
routerFixedCostCategory.delete(
    "/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_CONTABILITY"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteFixedCostCategory
);

export default routerFixedCostCategory;
