import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import {
    getMyBusiness,
    getMyConfigurations,
} from "../../controllers/shop/business";

const routerShopBusiness = Router();

routerShopBusiness.get(
    "/",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    getMyBusiness
);

routerShopBusiness.get(
    "/configs",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    getMyConfigurations
);

export default routerShopBusiness;
