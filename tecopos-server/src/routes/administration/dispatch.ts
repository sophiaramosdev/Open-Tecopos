import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";

import {
    findAllDispatches,
    newDispatch,
    getDispatch,
    acceptDispatch,
    rejectDispatch,
    rejectDispatchWithReturnProducts,
    getPendingDispatches,
    addProductsToDispatch,
    addProductsToDispatchV2,
} from "../../controllers/administration/dispatch";
import Dispatch from "../../database/models/dispatch";
import { acceptDispatchWithReturnProducts } from "../../controllers/administration/dispatch";
import {
    newDispatchFromProductionOrder,
    newDispatchFromOrderReceipt,
} from "../../controllers/administration/dispatch";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { transformDispatchIntoBilling } from "../../controllers/administration/billingOrder";

const routerDispatch = Router();

//Sales Category
routerDispatch.post(
    "/dispatch",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("mode", "mode field is missing").not().isEmpty(),
        check("stockAreaToId", "stockAreaToId field is missing")
            .not()
            .isEmpty(),
        check("stockAreaFromId", "stockAreaFromId field is missing")
            .not()
            .isEmpty(),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products field is not an array").isArray(),
        fieldValidator,
        attReceivedValidator(Dispatch, ["products"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "MANAGER_AREA", "MANAGER_PRODUCTION"]),
        businessValidator(),
    ],
    newDispatch
);

routerDispatch.post(
    "/dispatch/v2",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("stockAreaToId", "stockAreaToId field is missing")
            .not()
            .isEmpty(),
        check("stockAreaFromId", "stockAreaFromId field is missing")
            .not()
            .isEmpty(),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products field is not an array").isArray(),
        fieldValidator,
        attReceivedValidator(Dispatch, ["products"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "MANAGER_AREA", "MANAGER_PRODUCTION"]),
        businessValidator(),
    ],
    newDispatch
);

routerDispatch.post(
    "/dispatch/:dispatchId/billtransform",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("areaSalesId", "areaSalesId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "OWNER",
            "ADMIN",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHIFT",
        ]),
        businessValidator(),
    ],
    transformDispatchIntoBilling
);

routerDispatch.post(
    "/dispatch/:dispatchId/addproduct",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("stockAreaFromId", "stockAreaFromId field is missing")
            .not()
            .isEmpty(),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products field is not an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "OWNER",
            "ADMIN",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHIFT",
        ]),
        businessValidator(),
    ],
    addProductsToDispatch
);

routerDispatch.post(
    "/dispatch/v2/:dispatchId/addproduct",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("stockAreaFromId", "stockAreaFromId field is missing")
            .not()
            .isEmpty(),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products field is not an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "OWNER",
            "ADMIN",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHIFT",
        ]),
        businessValidator(),
    ],
    addProductsToDispatchV2
);

routerDispatch.post(
    "/dispatch/orderproduction",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("stockAreaToId", "stockAreaToId field is missing")
            .not()
            .isEmpty(),
        check("stockAreaFromId", "stockAreaFromId field is missing")
            .not()
            .isEmpty(),
        check("productionOrderId", "productionOrderId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        attReceivedValidator(Dispatch, ["productionOrderId"]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
    ],
    newDispatchFromProductionOrder
);

routerDispatch.post(
    "/dispatch/orderreceipt",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("stockAreaToId", "stockAreaToId field is missing")
            .not()
            .isEmpty(),
        check("orderReceiptId", "orderReceiptId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        attReceivedValidator(Dispatch, ["orderReceiptId"]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
            "MANAGER_SALES",
        ]),
        businessValidator(),
    ],
    newDispatchFromOrderReceipt
);

routerDispatch.get(
    "/dispatch",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
    ],
    findAllDispatches
);

//Deprecated
routerDispatch.patch(
    "/dispatch/ACCEPTED/:dispatchId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
    ],
    acceptDispatch
);

routerDispatch.patch(
    "/dispatch/FULLACCEPTED/:dispatchId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
    ],
    acceptDispatchWithReturnProducts
);

routerDispatch.patch(
    "/dispatch/FULLREJECTED/:dispatchId/:userAreaFromId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
    ],
    rejectDispatchWithReturnProducts
);

//Deprecated
routerDispatch.patch(
    "/dispatch/REJECTED/:dispatchId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
    ],
    rejectDispatch
);

routerDispatch.get(
    "/dispatch/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
    ],
    getDispatch
);

routerDispatch.get(
    "/pending-dispatches/:businessId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
    ],
    getPendingDispatches
);

export default routerDispatch;
