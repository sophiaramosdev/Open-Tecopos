import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import {
    editWooClient,
    editWooOrder,
    migrateCountriesWoo,
    newWooClient,
    newWooOrder,
    syncPaymentGateways,
    syncroniceWooOrder,
} from "../../controllers/woocommerce/woocommerce";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import { moduleValidator } from "../../middlewares/moduleValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerWoocommerce = Router();

routerWoocommerce.post(
    "/data/countries",
    [
        originValidator(["Codyas-Woocommerce"]),
        onlineAccessValidator,
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["WOOCOMMERCE"]),
    ],
    migrateCountriesWoo
);

routerWoocommerce.post(
    "/sync-order/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        moduleValidator(["WOOCOMMERCE"]),
    ],
    syncroniceWooOrder
);

routerWoocommerce.post(
    "/orders/:id",
    [
        originValidator(["Codyas-Woocommerce"]),
        onlineAccessValidator,
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["WOOCOMMERCE"]),
    ],
    newWooOrder
);

routerWoocommerce.put(
    "/orders/:id",
    [
        originValidator(["Codyas-Woocommerce"]),
        onlineAccessValidator,
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["WOOCOMMERCE"]),
    ],
    editWooOrder
);

routerWoocommerce.post(
    "/client/:id",
    [
        originValidator(["Codyas-Woocommerce"]),
        onlineAccessValidator,
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["WOOCOMMERCE"]),
    ],
    newWooClient
);

routerWoocommerce.put(
    "/client/:id",
    [
        originValidator(["Codyas-Woocommerce"]),
        onlineAccessValidator,
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["WOOCOMMERCE"]),
    ],
    editWooClient
);

routerWoocommerce.get(
    "/paymentgateway/sync",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    syncPaymentGateways
);

export default routerWoocommerce;
