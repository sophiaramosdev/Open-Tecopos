import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";

import {
    findAllProductsArea,
    getAllStockProductToManufacturer,
    getLastStockInvetory,
    getProductStockArea,
    getStockInvetory,
    getStockQuickReport,
    searchProductStockAreaByCode,
} from "../../controllers/administration/productStock";
import { allowedPlans } from "../../middlewares/allowedPlans";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerProductStock = Router();

routerProductStock.get(
    "/stock/quick-report/:areaId",
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
            "MANAGER_AREA",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getStockQuickReport
);

routerProductStock.get(
    "/product/area/:areaId",
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
            "MANAGER_AREA",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_CONTABILITY",
            "PRODUCT_PROCESATOR",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT",
            "WEITRESS",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllProductsArea
);

routerProductStock.get(
    "/product/production-area/:areaId",
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
            "MANAGER_AREA",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_CONTABILITY",
            "PRODUCT_PROCESATOR",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllStockProductToManufacturer
);

routerProductStock.get(
    "/product/:areaId/:id",
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
            "MANAGER_AREA",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_CONTABILITY",
            "PRODUCT_PROCESATOR",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT",
            "WEITRESS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getProductStockArea
);

routerProductStock.get(
    "/search/barcode/stock/:areaId",
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
            "MANAGER_AREA",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_CONTABILITY",
            "PRODUCT_PROCESATOR",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT",
            "WEITRESS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    searchProductStockAreaByCode
);

routerProductStock.get(
    "/stock/inventory/:economicCycleId/:areaId",
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
            "MANAGER_AREA",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getStockInvetory
);

routerProductStock.get(
    "/stock/last-inventory/:areaId",
    [
        originValidator(["Tecopos", "Tecopos-Terminal"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getLastStockInvetory
);

export default routerProductStock;
