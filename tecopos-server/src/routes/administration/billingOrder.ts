import { Router } from "express";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { originValidator } from "../../middlewares/originValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import {
    cancelBillingOrder,
    transformPreInvoiceIntoInvoice,
    editBillingOrder,
    findAllOrders,
    findAllPrepaidPayment,
    getBillingOrder,
    getOverduePayment,
    newBillingOrder,
    newPreBillingOrder,
    refundBillingOrder,
    refundPrepaidPayment,
    registerPrepaidPayments,
    remindCustomerPayment,
    summaryOrder,
    registerAPayment,
    getPrepaidPayment,
    deletedPartialPayment,
    editPrepaidPayments,
    getOverduePaymentV2,
    applyCouponToOrderAdmin,
} from "../../controllers/administration/billingOrder";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { check } from "express-validator";
import { moduleValidator } from "../../middlewares/moduleValidator";

const routerBillingOder = Router();

routerBillingOder.get(
    "/billing-order",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    findAllOrders
);
routerBillingOder.get(
    "/billing-order/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    getBillingOrder
);
routerBillingOder.post(
    "/pre-billing-order",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    newPreBillingOrder
);
routerBillingOder.delete(
    "/billing-order/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    cancelBillingOrder
);
routerBillingOder.patch(
    "/billing-order/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    editBillingOrder
);
routerBillingOder.post(
    "/billing-order",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    newBillingOrder
);
routerBillingOder.post(
    "/pay-order/:id",
    [
        check(
            "registeredPayments",
            "registeredPayments field is missing"
        ).not(),
        check(
            "registeredPayments",
            "registeredPayments is not an array"
        ).isArray(),
        fieldValidator,
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    registerAPayment
);
routerBillingOder.post(
    "/refund-order/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    refundBillingOrder
);
routerBillingOder.delete(
    "/partialPayment/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    deletedPartialPayment
);
routerBillingOder.post(
    "/prepaid-payments",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    registerPrepaidPayments
);
routerBillingOder.patch(
    "/prepaid-payments/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    editPrepaidPayments
);
routerBillingOder.get(
    "/prepaid-payments",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    findAllPrepaidPayment
);
routerBillingOder.get(
    "/prepaid-payments/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    getPrepaidPayment
);

routerBillingOder.patch(
    "/transform-orders/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    transformPreInvoiceIntoInvoice
);
routerBillingOder.post(
    "/remind-orders",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    remindCustomerPayment
);
routerBillingOder.get(
    "/overdue-payment",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    getOverduePayment
);
routerBillingOder.get(
    "/overdue-paymentV2",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    getOverduePaymentV2
);
routerBillingOder.get(
    "/summary-orders",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    summaryOrder
);
routerBillingOder.post(
    "/refund-prepaidPayment/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    refundPrepaidPayment
);
routerBillingOder.post(
    "/billing-order/coupon",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        moduleValidator(["BILLING"]),
    ],
    applyCouponToOrderAdmin
);

export default routerBillingOder;
