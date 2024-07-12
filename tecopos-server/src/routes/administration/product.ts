import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";

import Product from "../../database/models/product";

import {
    deleteProduct,
    editProduct,
    findAllProducts,
    getAllMeasures,
    getProduct,
    getProductDependencies,
    getProductSupplies,
    manageProductsInCombo,
    manageSupplies,
    newProduct,
    findAllManufacturablesProducts,
    newProductFixedCost,
    editProductFixedCost,
    findAllProductFixedCost,
    deleteProductFixedCost,
    getAllComboCompositions,
    duplicateAProduct,
    findAllProductsRecords,
    transformProductPrices,
    modifyPricesFromReference,
    findProductByBarcode,
    importAndCreateProduct,
} from "../../controllers/administration/product";
import ProductFixedCost from "../../database/models/productFixedCost";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerProduct = Router();

routerProduct.post(
    "/importer/products",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    importAndCreateProduct
);

//Product
routerProduct.post(
    "/product",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        check("type", "type field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Product, [
            "prices",
            "price",
            "listProductionAreas",
            "images",
        ]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    newProduct
);

routerProduct.post(
    "/product/duplicator",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    duplicateAProduct
);

routerProduct.post(
    "/product/transformprices",
    [
        originValidator(["Tecopos-Admin"]),
        check("mode", "mode field is missing").not().isEmpty(),
        check("codeCurrency", "codeCurrency field is missing").not().isEmpty(),
        check("percent", "percent field is missing").not().isEmpty(),
        check("adjustType", "adjustType field is missing").not().isEmpty(),
        check("priceSystemId", "priceSystemId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN"]),
        businessValidator(),
    ],
    transformProductPrices
);

routerProduct.post(
    "/product/pricesfromreference",
    [
        originValidator(["Tecopos-Admin"]),
        check("codeCurrency", "codeCurrency field is missing").not().isEmpty(),
        check("adjustType", "adjustType field is missing").not().isEmpty(),
        check("exchangeRate", "exchangeRate field is missing").not().isEmpty(),
        check("baseCodeCurrency", "baseCodeCurrency field is missing")
            .not()
            .isEmpty(),
        check("basePriceSystemId", "basePriceSystemId field is missing")
            .not()
            .isEmpty(),
        check("priceSystemId", "priceSystemId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN"]),
        businessValidator(),
    ],
    modifyPricesFromReference
);

routerProduct.patch(
    "/product/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(Product, [
            "availableAddons",
            "prices",
            "price",
            "listProductionAreas",
            "images",
            "onSalePrice",
            "combo",
            "resourceIds",
            "policyIds",
            "hasDurationEdit"
        ]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    editProduct
);

routerProduct.delete(
    "/product/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
    ],
    deleteProduct
);

routerProduct.get(
    "/product",
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
    findAllProducts
);

routerProduct.get(
    "/product/combocompositions",
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
    getAllComboCompositions
);

routerProduct.get(
    "/manufacturables",
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
    findAllManufacturablesProducts
);

routerProduct.get(
    "/product/:id",
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
    getProduct
);

routerProduct.get(
    "/product/barcode/:search",
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
    findProductByBarcode
);

//Nomenclators
routerProduct.get(
    "/measures",
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
    getAllMeasures
);

//Supplies
routerProduct.post(
    "/supplies/manage/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("products", "products field is missing").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageSupplies
);

routerProduct.get(
    "/supplies/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getProductSupplies
);

routerProduct.get(
    "/dependencies/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getProductDependencies
);

//Combo-subproducts
routerProduct.post(
    "/combo/manage/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("products", "products field is missing").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageProductsInCombo
);

//Fixed Costs
routerProduct.post(
    "/product-fixedcost",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("costAmount", "costAmount field is missing").not().isEmpty(),
        check("productId", "productId field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(ProductFixedCost),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newProductFixedCost
);

routerProduct.patch(
    "/product-fixedcost/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(ProductFixedCost),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editProductFixedCost
);

routerProduct.get(
    "/product-fixedcost/:productId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllProductFixedCost
);

routerProduct.delete(
    "/product-fixedcost/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteProductFixedCost
);

routerProduct.get(
    "/product-records/:id",
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
    findAllProductsRecords
);

export default routerProduct;
