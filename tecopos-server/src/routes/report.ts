import { Router } from "express";

import {
    findAllSelledProducts,
    getAllOrders,
    getAllOrdersManagedBy,
    getAreaSalesIncomes,
    getGeneralFinancialReport,
    getGeneralStockReport,
    getGraphSales,
    getGroupTotalSales,
    getGroupTotalSalesV2,
    getLast7DaysSalesBusiness,
    getLastAreaSalesIncomes,
    getMostSelledCategories,
    getReportStockDisponibility,
    getStateInvetoryPeriod,
    getSummarizeCustomerOrders,
    getTipsByPerson,
    getUsedCouponsByClient,
    summarizeAllOrders,
} from "../controllers/report";
import { jwtValidator } from "../middlewares/jwtValidator";
import { getProductSales } from "../controllers/report";
import { getMostSelledProducts } from "../controllers/report";
import { originValidator } from "../middlewares/originValidator";
import { allowedPlans } from "../middlewares/allowedPlans";
import { businessValidator } from "../middlewares/businessValidator";
import { allowedRoles } from "../middlewares/allowedRoles";
import { check } from "express-validator";
import { fieldValidator } from "../middlewares/fieldValidator";

const routerReport = Router();

routerReport.get(
    "/selled-products",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
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
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllSelledProducts
);

routerReport.get(
    "/byorders",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "ANALYSIS_REPORT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllOrders
);

routerReport.get(
    "/orders/managedBy",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "ANALYSIS_REPORT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllOrdersManagedBy
);

routerReport.get(
    "/orders/summary",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "ANALYSIS_REPORT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    summarizeAllOrders
);

routerReport.get(
    "/incomes/sales/:mode",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "ANALYSIS_REPORT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getGraphSales
);

routerReport.get(
    "/stock/inventory",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
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
    getGeneralStockReport
);

routerReport.get(
    "/stock/period-inventory",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
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
    getStateInvetoryPeriod
);

routerReport.get(
    "/stock/disponibility",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
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
    getReportStockDisponibility
);

routerReport.get(
    "/incomes/total-sales",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getGroupTotalSales
);

routerReport.get(
    "/incomes/v2/total-sales",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getGroupTotalSalesV2
);

routerReport.get(
    "/incomes/most-selled-categories",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "ANALYSIS_REPORT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getMostSelledCategories
);

routerReport.get(
    "/selled-products/most-selled/:mode",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
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
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getMostSelledProducts
);

routerReport.get(
    "/summarize/customer/:couponCode",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "PRODUCT_PROCESATOR",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getUsedCouponsByClient
);

routerReport.get(
    "/summarize/customerorders",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_ECONOMIC_CYCLE",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getSummarizeCustomerOrders
);

routerReport.get(
    "/incomes/last-7-days/:businessId",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getLast7DaysSalesBusiness
);

routerReport.post(
    "/financial/general",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("dateFrom", "dateFrom field is missing").not().isEmpty(),
        check("dateTo", "dateTo field is missing").not().isEmpty(),
        check("origin", "origin field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_CONTABILITY",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getGeneralFinancialReport
);

routerReport.get(
    "/incomes/cycle/:id/area/:areaId",
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
            "MANAGER_SHIFT",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAreaSalesIncomes
);

routerReport.get(
    "/incomes/latest-cycle/:areaId",
    [
        originValidator(["Tecopos", "Tecopos-Terminal"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getLastAreaSalesIncomes
);

routerReport.get(
    "/tips/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getTipsByPerson
);

routerReport.get(
    "/product/sales/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getProductSales
);

export default routerReport;
