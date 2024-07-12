import { Router } from "express";
import { check } from "express-validator";
import {
    cancelOrder,
    createFastOrderFromQueue,
    editOrder,
    editStatusProductionTicket,
    editSelledProduct,
    bulkEditStatusSelledProducts,
    findAllCashOperations,
    findAllOrders,
    getActiveProductVariations,
    getAllActiveProducts,
    getAllOrdersPOS,
    getAllSalesProductsInArea,
    getOrder,
    manageProductsInOrder,
    payOrder,
    moveLocallyAnOrder,
    moveOrderBetweenAreas,
    joinOrder,
    editOnlineOrder,
    applyCouponToOrderPOS,
    getAllOrderStatus,
    registerAPayment,
    deleteRegisteredPayment,
    transformOrderToPOS,
    returnOrderToOnline,
    refundOrder,
    findAllOrdersWhereProducts,
    successTecopaySale,
    failTecopaySale,
    checkStatusOrder,
    findAllOrdersV2,
    createOpenOrder,
    findAllOrdersForTransfer,
    modifyProductsInOrder,
    searchSalesProductsInArea,
    reOpenOrder,
    findAllPartialPayments,
    splitOrder,
} from "../controllers/sales";

import { attReceivedValidator } from "../middlewares/attReceivedValidator";
import { fieldValidator } from "../middlewares/fieldValidator";
import { jwtValidator } from "../middlewares/jwtValidator";
import OrderReceipt from "../database/models/orderReceipt";
import { allowedRoles } from "../middlewares/allowedRoles";
import { addCashOperation, removeCashOperation } from "../controllers/sales";
import { originValidator } from "../middlewares/originValidator";
import { allowedPlans } from "../middlewares/allowedPlans";
import { businessValidator } from "../middlewares/businessValidator";

const salesRouter = Router();

//Sales
salesRouter.get(
    "/area/:areaId/search",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    searchSalesProductsInArea
);

salesRouter.get(
    "/area/:areaId/products",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllSalesProductsInArea
);

salesRouter.post(
    "/coupon",
    [
        originValidator(["Tecopos", "Tecopos-Terminal"]),
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
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    applyCouponToOrderPOS
);

//Order
salesRouter.post(
    "/queue/neworder",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    createFastOrderFromQueue
);

salesRouter.post(
    "/online/transformorder",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
    ],
    transformOrderToPOS
);

salesRouter.post(
    "/tecopay/success",
    [originValidator(["Tecopay-Server"])],
    successTecopaySale
);

salesRouter.post(
    "/tecopay/fail",
    [originValidator(["Tecopay-Server"])],
    failTecopaySale
);

//@Deprecated
salesRouter.get(
    "/order",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_ECONOMIC_CYCLE",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllOrders
);

salesRouter.get(
    "/v2/order/fortransfer",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_ECONOMIC_CYCLE",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllOrdersForTransfer
);

salesRouter.get(
    "/v2/order",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_ECONOMIC_CYCLE",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MARKETING_SALES",
            "MANAGER_SHIPPING"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllOrdersV2
);

salesRouter.get(
    "/order/products/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_ECONOMIC_CYCLE",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "PRODUCT_PROCESATOR",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllOrdersWhereProducts
);

salesRouter.get(
    "/statusorder",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos-Management",
            "Tecopos-Shop",
            "Tecopos-ShopApk",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllOrderStatus
);

salesRouter.get(
    "/order/pos/:areaId",
    [
        originValidator(["Tecopos", "Tecopos-Terminal"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllOrdersPOS
);

salesRouter.get(
    "/order/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_ECONOMIC_CYCLE",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MARKETING_SALES",
            "MANAGER_SHIPPING"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getOrder
);

salesRouter.get(
    "/order/check/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    checkStatusOrder
);

salesRouter.patch(
    "/order/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(OrderReceipt),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
    ],
    editOrder
);

salesRouter.patch(
    "/order/:id/reopen",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(OrderReceipt),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
    ],
    reOpenOrder
);

salesRouter.post(
    "/order/:id/return-online",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(OrderReceipt),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MARKETING_SALES",
        ]),
    ],
    returnOrderToOnline
);

salesRouter.patch(
    "/online-order/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(OrderReceipt),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHOP_ONLINE",
            "MARKETING_SALES",
            "MANAGER_SHIPPING"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editOnlineOrder
);

salesRouter.delete(
    "/order/cancel/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHOP_ONLINE",
            "MARKETING_SALES",
        ]),
    ],
    cancelOrder
);

salesRouter.post(
    "/pay/order/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check(
            "registeredPayments",
            "registeredPayments is not an array"
        ).isArray(),
        check("discount", "discount is not an array").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
    ],
    payOrder
);

salesRouter.post(
    "/refund/order/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("areaSalesId", "areaSalesId is not an array").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
    ],
    refundOrder
);

//@Deprecated use billingOrder/registerAPayment
salesRouter.post(
    "/pay/register/:id",
    [
        originValidator(["Tecopos-Admin"]),
        check(
            "registeredPayments",
            "registeredPayments is not an array"
        ).isArray(),
        fieldValidator,
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
    ],
    registerAPayment
);

salesRouter.delete(
    "/pay/register/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
    ],
    deleteRegisteredPayment
);

salesRouter.patch(
    "/order/movement/:orderId/localmove",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("resources", "resources field is missing").not().isEmpty(),
        check("resources", "resources must be an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    moveLocallyAnOrder
);

salesRouter.patch(
    "/order/movement/:orderId/area/:areaToId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
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
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    moveOrderBetweenAreas
);

salesRouter.post(
    "/order/join/:orderId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("orderToJoinId", "orderToJoinId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
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
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    joinOrder
);

salesRouter.post(
    "/order/split/:orderId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("selledProducts", "selledProducts field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
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
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    splitOrder
);

//@Deprecated
salesRouter.post(
    "/order/manage-products/:orderId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageProductsInOrder
);

salesRouter.post(
    "/order/modifyproducts/:orderId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    modifyProductsInOrder
);

salesRouter.post(
    "/order/createopen",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    createOpenOrder
);

salesRouter.post(
    "/order/manage-products/:orderId/:creation",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageProductsInOrder
);

//Active products
salesRouter.get(
    "/active-products/area/:areaId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_PRODUCTION",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllActiveProducts
);

salesRouter.get(
    "/variation/product/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_PRODUCTION",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getActiveProductVariations
);

salesRouter.patch(
    "/selled-products",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_PRODUCTION",
            "WEITRESS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    bulkEditStatusSelledProducts
);
salesRouter.patch(
    "/selled-product/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_PRODUCTION",
            "WEITRESS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editSelledProduct
);
salesRouter.patch(
    "/production-ticket/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_PRODUCTION",
            "WEITRESS",
        ]),
    ],
    editStatusProductionTicket
);

//Cash operations
salesRouter.post(
    "/cash-operation/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("amount", "amount field is missing").not().isEmpty(),
        check("operation", "operation field is missing").not().isEmpty(),
        check("codeCurrency", "codeCurrency field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
    ],
    addCashOperation
);
salesRouter.delete(
    "/cash-operation/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
        ]),
    ],
    removeCashOperation
);
salesRouter.get(
    "/cash-operation",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllCashOperations
);

salesRouter.get(
    "/partialpayments",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllPartialPayments
);

export default salesRouter;
