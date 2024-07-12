import { Router } from "express";
import { check } from "express-validator";

import { attReceivedValidator } from "../middlewares/attReceivedValidator";
import { fieldValidator } from "../middlewares/fieldValidator";
import { jwtValidator } from "../middlewares/jwtValidator";

import {
    deleteResource,
    deleteSalesCategory,
    deleteSupplier,
    editCurrency,
    editResource,
    editSalesCategory,
    findAllResources,
    newResource,
    newSalesCategory,
    newSupplier,
    getGeneralConfigs,
    findAllSalesCategory,
    requestChangePassword,
    findAllCurrencies,
    getPaymentWays,
    findAllResourcesByBusiness,
    deleteReservationPolicy,
    updateReservationPolicy,
    createReservationPolicy,
    findAllReservationPolicy,
} from "../controllers/administration";

import SalesCategory from "../database/models/salesCategory";
import Resource from "../database/models/resource";
import Supplier from "../database/models/supplier";
import {
    getSalesCategoryActives,
    addCurrency,
    removeCurrency,
} from "../controllers/administration";
import AvailableCurrency from "../database/models/availableCurrency";
import {
    editSupplier,
    getSupplier,
    findAllSuppliers,
} from "../controllers/administration";
import { allowedRoles } from "../middlewares/allowedRoles";
import { manageManufacturers } from "../controllers/administration";
import {
    addPriceSystem,
    editPriceSystem,
    removePriceSystem,
} from "../controllers/administration";
import { originValidator } from "../middlewares/originValidator";
import { businessValidator } from "../middlewares/businessValidator";
import { allowedPlans } from "../middlewares/allowedPlans";

const routerAdmin = Router();

//Payments ways
routerAdmin.get(
    "/paymentways",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management", "Tecopos"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getPaymentWays
);

//Business
routerAdmin.get(
    "/configs",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
    ],
    getGeneralConfigs
);
//Currency
routerAdmin.post(
    "/currency",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("exchangeRate", "exchangeRate field is missing").not().isEmpty(),
        check("currencyId", "currencyId field is missing").not().isEmpty(),
        check("isMain", "isMain field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(AvailableCurrency),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "FULL", "POPULAR"]),
    ],
    addCurrency
);
routerAdmin.patch(
    "/currency/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(AvailableCurrency, ["replyToChilds"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editCurrency
);
routerAdmin.get(
    "/currency",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllCurrencies
);
routerAdmin.delete(
    "/currency/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    removeCurrency
);

//Price System
routerAdmin.post(
    "/pricesystem",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    addPriceSystem
);
routerAdmin.patch(
    "/pricesystem/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editPriceSystem
);
routerAdmin.delete(
    "/pricesystem/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_COST_PRICES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    removePriceSystem
);

//Supplier
routerAdmin.post(
    "/supplier",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Supplier, ["address", "phones"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_AREA",
            "PRODUCT_PROCESATOR",
            "MANAGER_SUPPLIERS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newSupplier
);
routerAdmin.patch(
    "/supplier/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(Supplier, ["address", "phones"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_AREA",
            "PRODUCT_PROCESATOR",
            "MANAGER_SUPPLIERS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editSupplier
);
routerAdmin.delete(
    "/supplier/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_AREA",
            "PRODUCT_PROCESATOR",
            "MANAGER_SUPPLIERS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteSupplier
);
routerAdmin.get(
    "/supplier/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_AREA",
            "PRODUCT_PROCESATOR",
            "MANAGER_SUPPLIERS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getSupplier
);
routerAdmin.get(
    "/supplier",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_AREA",
            "PRODUCT_PROCESATOR",
            "MANAGER_COST_PRICES",
            "MANAGER_SUPPLIERS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllSuppliers
);

//Resources
routerAdmin.post(
    "/resource/:area",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("code", "name field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newResource
);
routerAdmin.patch(
    "/resource/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(Resource),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editResource
);

routerAdmin.get(
    "/resource/:areaId",
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
    findAllResources
);
routerAdmin.get(
    "/resource-business",
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
            "MANAGER_CONTABILITY",
            "PRODUCT_PROCESATOR",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT",
            "WEITRESS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllResourcesByBusiness
);
routerAdmin.delete(
    "/resource/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteResource
);

//Sales Category
routerAdmin.post(
    "/salescategory",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(SalesCategory),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    newSalesCategory
);
routerAdmin.patch(
    "/salescategory/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(SalesCategory),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    editSalesCategory
);
routerAdmin.get(
    "/salescategory",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
    ],
    findAllSalesCategory
);
routerAdmin.get(
    "/salescategory/actives",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
    ],
    getSalesCategoryActives
);
routerAdmin.delete(
    "/salescategory/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    deleteSalesCategory
);

routerAdmin.post(
    "/user/request-password",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("email", "El email proporcionado no es válido").isEmail(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
    ],
    requestChangePassword
);

//Manufacturers
routerAdmin.post(
    "/manufacturer/manage/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check(
            "listManufacturer",
            "listManufacturer field is missing"
        ).isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageManufacturers
);

///Create ReservationPolicy
routerAdmin.post(
    "/reservation-policy",
    [
        check("type", "Falta el campo tipo").not().isEmpty(),
        check("frequency", "Falta el campo de frecuencia").not().isEmpty(),
        check("discount", "Falta el campo de descuento")
            .not()
            .isEmpty()
            .isFloat(),
        check("isActive", "Falta el campo de activo").not().isEmpty(),
        check("quantity", "Falta el campo de cantidad").not().isEmpty().isInt(),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    createReservationPolicy
);

routerAdmin.get(
    "/reservation-policy",
    [jwtValidator, businessValidator()],
    findAllReservationPolicy
);
// routerAdmin.get(
//   "/reservation-policy/:id",
//   [jwtValidator, businessValidator()],
//   getReservationPolicy
// );

routerAdmin.patch(
    "/reservation-policy/:id",
    [
        check("type", "Type field is missing").optional().not().isEmpty(),
        check("frequency", "Frequency field is missing")
            .optional()
            .not()
            .isEmpty(),
        check("discount", "Discount field is missing")
            .optional()
            .not()
            .isEmpty()
            .isFloat(),
        check("description", "Description field is missing")
            .optional()
            .not()
            .isEmpty(),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    updateReservationPolicy
);

routerAdmin.delete(
    "/reservation-policy/:id",
    [
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    deleteReservationPolicy
);

export default routerAdmin;
