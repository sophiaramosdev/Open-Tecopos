import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import ProductionOrder from "../../database/models/productionOrder";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import {
    closeProductionOrder,
    createProductionOrder,
    deleteProductionOrderFixedCost,
    editProductionOrderFixedCost,
    findAllProductionOrderFixedCost,
    getProductionOrdersToManufacturer,
    modifyProductionOrder,
    newProductionOrderFixedCost,
} from "../../controllers/administration/productionOrder";

import {
    findAllProductionOrders,
    getProductionOrder,
    deleteProductionOrder,
} from "../../controllers/administration/productionOrder";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { duplicateProductionOrder } from "../../controllers/administration/productionOrder";
import OrderProductionFixedCost from "../../database/models/orderProductionFixedCost";

const routerProductionOrder = Router();

routerProductionOrder.post(
    "/productionOrder",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management", "Tecopos"]),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products is not an array").isArray(),
        check("openDate", "openDate field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "CHIEF_PRODUCTION"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    createProductionOrder
);

routerProductionOrder.post(
    "/productionOrder/duplicate",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("orderProductionId", "orderProductionId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "CHIEF_PRODUCTION"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    duplicateProductionOrder
);

routerProductionOrder.post(
    "/productionOrder/:id/close",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        attReceivedValidator(ProductionOrder, ["products"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_SHIFT", "CHIEF_PRODUCTION"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    closeProductionOrder
);

routerProductionOrder.patch(
    "/productionOrder/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        attReceivedValidator(ProductionOrder, ["products"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "CHIEF_PRODUCTION"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    modifyProductionOrder
);

routerProductionOrder.get(
    "/productionOrder",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT", //TODO: Deprecated
            "MANAGER_AREA",
            "CHIEF_PRODUCTION",
            "MANAGER_COST_PRICES"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllProductionOrders
);

routerProductionOrder.get(
    "/manufacturers/productionorders",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT", //TODO: Deprecated
            "MANAGER_AREA",
            "CHIEF_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getProductionOrdersToManufacturer
);

routerProductionOrder.get(
    "/productionOrder/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT", //TODO: Deprecated
            "MANAGER_AREA",
            "CHIEF_PRODUCTION",
            "MANAGER_COST_PRICES"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getProductionOrder
);
routerProductionOrder.delete(
    "/productionOrder/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "CHIEF_PRODUCTION"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteProductionOrder
);

//Fixed Costs
routerProductionOrder.post(
    "/productionorder/:id/fixedcost",
    [
        originValidator(["Tecopos-Admin"]),
        check("costAmount", "costAmount field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(OrderProductionFixedCost),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newProductionOrderFixedCost
);

routerProductionOrder.patch(
    "/productionorder/fixedcost/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(OrderProductionFixedCost),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editProductionOrderFixedCost
);

routerProductionOrder.get(
    "/productionorder/:id/fixedcost",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllProductionOrderFixedCost
);

routerProductionOrder.delete(
    "/productionorder/fixedcost/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteProductionOrderFixedCost
);

export default routerProductionOrder;
