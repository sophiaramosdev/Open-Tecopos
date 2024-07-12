import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import { findAllRegions } from "../../controllers/shop/shipping";

const routerShopShipping = Router();

routerShopShipping.get(
    "/region",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    findAllRegions
);

export default routerShopShipping;
