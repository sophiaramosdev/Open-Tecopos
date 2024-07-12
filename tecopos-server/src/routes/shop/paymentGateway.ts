import { Router } from "express";
import { check } from "express-validator";
import { originValidator } from "../../middlewares/originValidator";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import {
    createPaymentLinkTropipay,
    feedbackTropiPay,
    getActivesPaymentGateway,
} from "../../controllers/marketplace/paymentGateway";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";

const routerPaymentGateway = Router();

routerPaymentGateway.get(
    "/paymentgateway",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    getActivesPaymentGateway
);

routerPaymentGateway.post(
    "/paymentgateway/create-tropipay-link",
    [
        check("orderId", "El campo orderId no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
    ],
    createPaymentLinkTropipay
);

routerPaymentGateway.post("/feedback-tropipay", feedbackTropiPay);

export default routerPaymentGateway;
