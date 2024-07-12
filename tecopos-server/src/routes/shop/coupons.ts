import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import { applyCouponToOrder } from "../../controllers/shop/coupons";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";

const routerShopCoupons = Router();

routerShopCoupons.post(
    "/",
    [
        originValidator([
            "Tecopos-Shop",
            "Tecopos-Marketplace",
            "Tecopos-ShopApk",
        ]),
        check("coupons", "El campo coupons no fue proporcionado")
            .not()
            .isEmpty(),
        check("coupons", "El campo coupons no es un arreglo").isArray(),
        check("listProducts", "El campo listProducts no fue proporcionado")
            .not()
            .isEmpty(),
        check(
            "listProducts",
            "El campo listProducts no es un arreglo"
        ).isArray(),
        fieldValidator,
        onlineAccessValidator,
    ],
    applyCouponToOrder
);

export default routerShopCoupons;
