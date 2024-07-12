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
    deleteModifier,
    editModifier,
    findAllModifiers,
    newModifier,
} from "../../controllers/administration/modifier";
import Modifier from "../../database/models/modifier";

const routerModifier = Router();

//Product Category
routerModifier.post(
    "/",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("type", "type field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Modifier, ["fixedPrice"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_CONTABILITY"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newModifier
);

routerModifier.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(Modifier, ["fixedPrice"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_CONTABILITY"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editModifier
);

routerModifier.get(
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
    findAllModifiers
);

routerModifier.delete(
    "/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_CONTABILITY"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteModifier
);

export default routerModifier;
