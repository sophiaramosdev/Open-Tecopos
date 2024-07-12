import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";

import {
    newProductState,
    findAllProductStates,
    deleteProductState,
} from "../../controllers/administration/productState";
import ProductState from "../../database/models/productState";
import { editProductState } from "../../controllers/administration/productState";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerProductState = Router();

routerProductState.post(
    "/productstate",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newProductState
);
routerProductState.patch(
    "/productstate/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(ProductState),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editProductState
);
routerProductState.get(
    "/productstate",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllProductStates
);
routerProductState.delete(
    "/productstate/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteProductState
);

export default routerProductState;
