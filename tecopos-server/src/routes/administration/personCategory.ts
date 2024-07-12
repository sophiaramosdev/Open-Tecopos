import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";

import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    editPersonCategory,
    newPersonCategory,
    findAllPersonCategories,
    deletePersonCategory,
} from "../../controllers/administration/personCategory";
import PersonCategory from "../../database/models/personCategory";

const routerPersonCategory = Router();

routerPersonCategory.post(
    "/",
    [
        originValidator(["Tecopos-Admin"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    newPersonCategory
);
routerPersonCategory.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(PersonCategory),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    editPersonCategory
);
routerPersonCategory.get(
    "/",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    findAllPersonCategories
);
routerPersonCategory.delete(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    deletePersonCategory
);

export default routerPersonCategory;
