import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import {
    createPaymentLinkTropipay,
    feedbackTropiPay,
    getActivesPaymentGateway,
} from "../../controllers/marketplace/paymentGateway";
import { marketPlaceBusinessValidator } from "../../middlewares/marketPlaceBusinessValidator";
import { marketPlaceAccessValidator } from "../../middlewares/marketPlaceAccessValidator";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";

const routerMarketPlacePaymentGateway = Router();

routerMarketPlacePaymentGateway.get(
    "/",
    [
        originValidator(["Tecopos-Marketplace"]),
        marketPlaceBusinessValidator(),
        marketPlaceAccessValidator(),
    ],
    getActivesPaymentGateway
);

routerMarketPlacePaymentGateway.post(
    "/create-tropipay-link",
    [
        check("orderId", "El campo orderId no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        originValidator(["Tecopos-Marketplace"]),
        jwtValidator,
        marketPlaceBusinessValidator(),
        marketPlaceAccessValidator(),
    ],
    createPaymentLinkTropipay
);

routerMarketPlacePaymentGateway.post("/feedback-tropipay", feedbackTropiPay);

export default routerMarketPlacePaymentGateway;
