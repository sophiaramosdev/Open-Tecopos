import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { check } from "express-validator";

import { fieldValidator } from "../../middlewares/fieldValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import {
    bulkTransformStockProduct,
    newProductionElaboration,
    bulkAdjustStockProduct,
    deleteStockMovementFromSerialArea,
    deleteStockMovementFromStateArea,
    getAllOperationsDifferentStateFromArea,
    getAllOperationsStateFromArea,
    bulkEntryStockProduct,
    bulkMoveStockProduct,
    bulkOutStockProduct,
    changeStateStockMovement,
    getAllOperationsFromSerialArea,
    getAllShiftMovementsInArea,
    adjustStockProduct,
    deleteBulkStockMovements,
    deleteStockMovement,
    editDescriptionStockMovement,
    entryStockProduct,
    findAllStockMovements,
    getStockMovement,
    manufacturedProduct,
    moveStockProduct,
    newElaboration,
    outStockProduct,
    bulkWasteStockProduct,
    wasteStockProduct,
    produceAnElaboration,
    deleteStockMovementFromProduction,
} from "../../controllers/administration/stockMovement";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerStockMovement = Router();

//Sock movements
routerStockMovement.post(
    "/movement/entry",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("quantity", "quantity field must be a number").isNumeric(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("stockAreaId", "stockAreaId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    entryStockProduct
);

routerStockMovement.post(
    "/movement/bulk/entry",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products is not an array").isArray(),
        check("stockAreaId", "stockAreaId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    bulkEntryStockProduct
);

routerStockMovement.post(
    "/movement/bulk/transformation",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products is not an array").isArray(),
        check("stockAreaId", "stockAreaId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    bulkTransformStockProduct
);

routerStockMovement.post(
    "/movement/bulk/move",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products is not an array").isArray(),
        check("stockAreaToId", "stockAreaToId field is missing")
            .not()
            .isEmpty(),
        check("stockAreaFromId", "stockAreaFromId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    bulkMoveStockProduct
);

routerStockMovement.post(
    "/movement/bulk/out",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products is not an array").isArray(),
        check("stockAreaId", "stockAreaToId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    bulkOutStockProduct
);

routerStockMovement.post(
    "/movement/bulk/waste",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products is not an array").isArray(),
        check("stockAreaId", "stockAreaToId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    bulkWasteStockProduct
);

routerStockMovement.post(
    "/movement/bulk/adjust",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products is not an array").isArray(),
        check("stockAreaId", "stockAreaToId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    bulkAdjustStockProduct
);

routerStockMovement.post(
    "/movement/move",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("movedToId", "movedToId field is missing").not().isEmpty(),
        check("areaId", "areaId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    moveStockProduct
);
routerStockMovement.post(
    "/movement/out",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("areaId", "areaId field is missing").not().isEmpty(),
        check("description", "description field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    outStockProduct
);

routerStockMovement.post(
    "/movement/waste",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("areaId", "areaId field is missing").not().isEmpty(),
        check("description", "description field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    wasteStockProduct
);

routerStockMovement.post(
    "/movement/adjust",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("areaId", "areaId field is missing").not().isEmpty(),
        check("description", "description field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    adjustStockProduct
);

routerStockMovement.post(
    "/movement/produce-elaboration",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("stockAreaId", "stockAreaId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    produceAnElaboration
);

//Deprecated
routerStockMovement.post(
    "/movement/new-elaboration",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("stockAreaId", "stockAreaId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newElaboration
);

routerStockMovement.post(
    "/movement/new-elaboration/production",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("manufacturerAreaId", "manufacturerAreaId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newProductionElaboration
);

routerStockMovement.post(
    "/movement/new-manufactured",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("quantity", "quantity field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        check("areaId", "areaId field is missing").not().isEmpty(),
        check("products", "products field is not array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manufacturedProduct
);
routerStockMovement.get(
    "/movement",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
            "MANAGER_SUPPLIERS",
            "ANALYSIS_REPORT"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllStockMovements
);

routerStockMovement.get(
    "/movements-serialarea/:productionOrderId/:areaId",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllOperationsFromSerialArea
);

routerStockMovement.get(
    "/movements-shift/:areaId",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllShiftMovementsInArea
);

routerStockMovement.get(
    "/movements-statearea/:productStateId/:areaId",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllOperationsStateFromArea
);

routerStockMovement.get(
    "/movements-differ-statearea/:productStates/:areaId",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllOperationsDifferentStateFromArea
);

routerStockMovement.get(
    "/movement/:id",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getStockMovement
);
routerStockMovement.delete(
    "/movement/:id",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteStockMovement
);

//TODO: Deprecated
routerStockMovement.delete(
    "/movement-statearea/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("manufacturerAreaId", "manufacturerAreaId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteStockMovementFromStateArea
);

//Deprecated
routerStockMovement.delete(
    "/movement-serialarea/:id",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteStockMovementFromSerialArea
);

routerStockMovement.delete(
    "/movement-production/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_PRODUCTION"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteStockMovementFromProduction
);

routerStockMovement.delete(
    "/movement-serialarea/:id",
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
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteStockMovementFromSerialArea
);

routerStockMovement.delete(
    "/bulk-movement/delete",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteBulkStockMovements
);
routerStockMovement.patch(
    "/movement/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("description", "description field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editDescriptionStockMovement
);

routerStockMovement.patch(
    "/movement-change-state/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("nextStateId", "nextStateId field is missing").not().isEmpty(),
        check("manufacturerAreaId", "manufacturerAreaId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    changeStateStockMovement
);

export default routerStockMovement;
