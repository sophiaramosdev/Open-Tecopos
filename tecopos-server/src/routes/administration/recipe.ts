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
    associateProductToRecipe,
    deleteRecipe,
    editRecipe,
    findAllRecipe,
    getRecipe,
    manageRawProductsRecipe,
    newRecipe,
} from "../../controllers/administration/recipe";
import Recipe from "../../database/models/recipe";

const routerAdministrationRecipe = Router();

routerAdministrationRecipe.get(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "CHIEF_PRODUCTION", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getRecipe
);

routerAdministrationRecipe.post(
    "/",
    [
        originValidator(["Tecopos-Admin"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Recipe),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "CHIEF_PRODUCTION", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newRecipe
);

routerAdministrationRecipe.post(
    "/manageproducts/:id",
    [
        originValidator(["Tecopos-Admin"]),
        check("products", "products field is missing").not().isEmpty(),
        check("measure", "measure field is missing").not().isEmpty(),
        check("unityToBeProduced", "unityToBeProduced field is missing")
            .not()
            .isEmpty(),
        check("realPerformance", "realPerformance field is missing")
            .not()
            .isEmpty(),
        check("products", "products field is not an array").isArray(),
        fieldValidator,
        attReceivedValidator(Recipe, ["products"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "CHIEF_PRODUCTION", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageRawProductsRecipe
);

routerAdministrationRecipe.post(
    "/associateproducts/:id",
    [
        originValidator(["Tecopos-Admin"]),
        check("products", "products field is not an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "CHIEF_PRODUCTION", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    associateProductToRecipe
);

routerAdministrationRecipe.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(Recipe),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "CHIEF_PRODUCTION", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editRecipe
);
routerAdministrationRecipe.get(
    "/",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllRecipe
);
routerAdministrationRecipe.delete(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "CHIEF_PRODUCTION", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteRecipe
);

export default routerAdministrationRecipe;
