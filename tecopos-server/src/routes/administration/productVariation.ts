import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";

import {
    addProductAttribute,
    addProductVariation,
    deleteProductAttribute,
    deleteProductVariation,
    editProductAttribute,
    editProductVariation,
    findAllAttributes,
    getProductAttributes,
    getProductVariations,
} from "../../controllers/administration/productVariation";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerProductVariation = Router();

//Variations && attributes
routerProductVariation.get(
    "/variation/attributes",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "PRODUCT_PROCESATOR",
            "MANAGER_AREA",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT",
            "ANALYSIS_REPORT"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllAttributes
);

routerProductVariation.post(
    "/variation/attribute/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("attributeId", "attributeId field is missing").not().isEmpty(),
        check("values", "values field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    addProductAttribute
);

routerProductVariation.delete(
    "/variation/attribute/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteProductAttribute
);

routerProductVariation.patch(
    "/variation/attribute/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("value", "value field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editProductAttribute
);

routerProductVariation.get(
    "/variation/attribute/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
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
    getProductAttributes
);

routerProductVariation.get(
    "/variation/product/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
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
    getProductVariations
);

routerProductVariation.post(
    "/variation/product/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("attributes", "attributes field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    addProductVariation
);

routerProductVariation.delete(
    "/variation/product/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteProductVariation
);

routerProductVariation.patch(
    "/variation/product/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editProductVariation
);

export default routerProductVariation;
