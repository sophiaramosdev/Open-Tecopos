import { Router } from "express";
import {
    addRegion,
    findAllRegions,
    editRegion,
    removeRegion,
    findAllDeliverers,
} from "../controllers/shipping";
import { attReceivedValidator } from "../middlewares/attReceivedValidator";
import { fieldValidator } from "../middlewares/fieldValidator";

import { jwtValidator } from "../middlewares/jwtValidator";
import ShippingRegion from "../database/models/shippingRegion";
import { check } from "express-validator";
import { originValidator } from "../middlewares/originValidator";
import { businessValidator } from "../middlewares/businessValidator";
import { allowedPlans } from "../middlewares/allowedPlans";
import { allowedRoles } from "../middlewares/allowedRoles";

const routerShipping = Router();

//Shipping
routerShipping.post(
    "/region",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        check("price", "price field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(ShippingRegion, ["price"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    addRegion
);
routerShipping.patch(
    "/region/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(ShippingRegion, ["price"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editRegion
);
routerShipping.delete(
    "/region/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    removeRegion
);
routerShipping.get(
    "/region",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllRegions
);

routerShipping.get(
    "/deliverers",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHOP_ONLINE",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllDeliverers
);

export default routerShipping;
