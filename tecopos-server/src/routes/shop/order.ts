import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import {
    cancelMyOrder,
    editOrder,
    findMyDeliveryOrders,
    findMyOrders,
    getOrder,
    newOnlineOrder,
    newOnlineOrderV2,
    newPreOnlineOrder,
} from "../../controllers/shop/order";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";

const routerShopOrder = Router();

//Deprecated
routerShopOrder.post(
    "/",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        check("products", "El campo products no es un arreglo").isArray(),
        check("products", "El campo products no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        onlineAccessValidator,
        businessValidator(),
    ],
    newOnlineOrder
);

routerShopOrder.post(
    "/v2",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        check("products", "El campo products no es un arreglo").isArray(),
        check("products", "El campo products no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        onlineAccessValidator,
        businessValidator(),
    ],
    newOnlineOrderV2
);

routerShopOrder.post(
    "/preorder",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        check("products", "El campo products no es un arreglo").isArray(),
        check("products", "El campo products no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        onlineAccessValidator,
        businessValidator(),
    ],
    newPreOnlineOrder
);

routerShopOrder.get(
    "/",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
        businessValidator(),
    ],
    findMyOrders
);

routerShopOrder.delete(
    "/:id",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
        businessValidator(),
    ],
    cancelMyOrder
);

routerShopOrder.get(
    "/mydeliveries",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
        businessValidator(),
    ],
    findMyDeliveryOrders
);

routerShopOrder.patch(
    "/:id",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_SHIPPING"]),
        businessValidator(),
    ],
    editOrder
);

routerShopOrder.get(
    "/:id",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
        businessValidator(),
    ],
    getOrder
);

export default routerShopOrder;
