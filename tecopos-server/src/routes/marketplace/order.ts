import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { marketPlaceBusinessValidator } from "../../middlewares/marketPlaceBusinessValidator";
import {
    cancelMyOrder,
    editOrder,
    findMyOrders,
    getOrder,
    newMarketPlaceOrder,
    newMarketPlaceOrderV2,
    newPreOnlineOrder,
    payOnlineOrder,
} from "../../controllers/marketplace/order";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { marketPlaceAccessValidator } from "../../middlewares/marketPlaceAccessValidator";

const routerMarketplaceOrder = Router();

routerMarketplaceOrder.post(
    "/",
    [
        originValidator(["Tecopos-Marketplace"]),
        check(
            "paymentGatewayId",
            "El campo paymentGatewayId no fue proporcionado"
        )
            .not()
            .isEmpty(),
        check("products", "El campo products no es un arreglo").isArray(),
        check("products", "El campo products no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    newMarketPlaceOrder
);

routerMarketplaceOrder.post(
    "/v2",
    [
        originValidator(["Tecopos-Marketplace"]),
        check(
            "paymentGatewayId",
            "El campo paymentGatewayId no fue proporcionado"
        )
            .not()
            .isEmpty(),
        check("products", "El campo products no es un arreglo").isArray(),
        check("products", "El campo products no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    newMarketPlaceOrderV2
);

routerMarketplaceOrder.post(
    "/preorder",
    [
        originValidator(["Tecopos-Marketplace"]),
        check(
            "paymentGatewayId",
            "El campo paymentGatewayId no fue proporcionado"
        )
            .not()
            .isEmpty(),
        check("products", "El campo products no es un arreglo").isArray(),
        check("products", "El campo products no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    newPreOnlineOrder
);

routerMarketplaceOrder.post(
    "/:id/pay",
    [
        originValidator(["Tecopos-Marketplace"]),
        check("amount", "El campo amount no fue proporcionado").not().isEmpty(),
        check("codeCurrency", "El campo codeCurrency no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    payOnlineOrder
);

routerMarketplaceOrder.get(
    "/",
    [
        originValidator(["Tecopos-Marketplace"]),
        jwtValidator,
        marketPlaceAccessValidator(),
    ],
    findMyOrders
);

routerMarketplaceOrder.delete(
    "/:id",
    [
        originValidator(["Tecopos-Marketplace"]),
        jwtValidator,
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    cancelMyOrder
);

routerMarketplaceOrder.patch(
    "/:id",
    [
        originValidator(["Tecopos-Marketplace"]),
        jwtValidator,
        marketPlaceAccessValidator(),
    ],
    editOrder
);

routerMarketplaceOrder.get(
    "/:id",
    [
        originValidator(["Tecopos-Marketplace"]),
        jwtValidator,
        marketPlaceAccessValidator(),
    ],
    getOrder
);

export default routerMarketplaceOrder;
