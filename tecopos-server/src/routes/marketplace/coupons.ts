import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { applyCouponToOrder } from "../../controllers/marketplace/coupons";

const routerMarketplaceCoupons = Router();

routerMarketplaceCoupons.post(
    "/",
    [
        originValidator(["Tecopos-Marketplace"]),
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

export default routerMarketplaceCoupons;
