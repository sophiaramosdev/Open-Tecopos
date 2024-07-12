import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import {
    findAllMostSelledProducts,
    findAllSalesProducts,
    findAllShopCategories,
    getProduct,
} from "../../controllers/shop/product";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import { findAllAttributes } from "../../controllers/administration/productVariation";

const routerShopProduct = Router();

routerShopProduct.get(
    "/forsale",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    findAllSalesProducts
);

routerShopProduct.get(
    "/mostselled",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    findAllMostSelledProducts
);

routerShopProduct.get(
    "/categories",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    findAllShopCategories
);

routerShopProduct.get(
    "/details/:id",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    getProduct
);

routerShopProduct.get(
    "/attributes",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    findAllAttributes
);

export default routerShopProduct;
