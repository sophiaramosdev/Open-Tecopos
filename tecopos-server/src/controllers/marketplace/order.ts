import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";
import moment from "moment";

import { config_transactions } from "../../database/seq-transactions";
import OrderReceipt from "../../database/models/orderReceipt";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import { getOrderStatus, getTitleOrderRecord } from "../../helpers/translator";
import Price from "../../database/models/price";
import { productQueue } from "../../bull-queue/product";
import OrderReceiptRecord from "../../database/models/orderReceiptRecord";
import User from "../../database/models/user";
import Business from "../../database/models/business";
import ConfigurationKey from "../../database/models/configurationKey";
import {
    exchangeCurrency,
    getProductPrice,
    internalCheckerResponse,
    mathOperation,
    truncateValue,
} from "../../helpers/utils";
import Logger from "../../lib/logger";
import { pag_params } from "../../database/pag_params";
import Client from "../../database/models/client";
import { ItemProductSelled } from "../../interfaces/models";
import {
    afterOrderCancelled,
    calculateOrderTotal,
    payOrderProcessator,
    registerSelledProductInOrder,
    restoreProductStockDisponibility,
    substractProductStockDisponibility,
} from "../helpers/products";
import ShippingAddress from "../../database/models/shippingAddress";
import BillingAddress from "../../database/models/billingAddress";
import { processCoupons } from "../helpers/coupons";
import Coupon from "../../database/models/coupon";
import ListUsedClientsCoupon from "../../database/models/listUsedClientsCoupon";
import OrderReceiptCoupon from "../../database/models/orderReceiptCoupon";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import Variation from "../../database/models/variation";
import SelledProduct from "../../database/models/selledProduct";
import Image from "../../database/models/image";
import Municipality from "../../database/models/municipality";
import Province from "../../database/models/province";
import Country from "../../database/models/country";
import SelledProductAddon from "../../database/models/selledProductAddon";
import PaymentGateway from "../../database/models/paymentGateway";
import {
    app_origin,
    order_receipt_status,
    payments_ways,
} from "../../interfaces/nomenclators";
import { emailQueue } from "../../bull-queue/email";
import { notificationNewOrder } from "../../helpers/emailComposer";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
    getEphimeralTermKey,
    getExpirationTime,
    getOrderFromCacheTransaction,
    getOrderRecordsCache,
    getStoreProductsCache,
} from "../../helpers/redisStructure";
import { redisClient } from "../../../app";
import { orderQueue } from "../../bull-queue/order";
import CurrencyPayment from "../../database/models/currencyPayment";
import CashRegisterOperation from "../../database/models/cashRegisterOperation";
import Address from "../../database/models/address";
import Phone from "../../database/models/phone";
import Product from "../../database/models/product";
import ProductPrice from "../../database/models/productPrice";
import SalesCategory from "../../database/models/salesCategory";

export interface OnlineProductFormat {
    productId: number;
    quantity: number;
}

export const newMarketPlaceOrderV2 = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    const definedCodeCurrency = req.header("X-Shop-CodeCurrency");

    //@ts-ignore
    const tId = t.id;

    try {
        const user: User = req.user;
        const business: Business = req.business;
        const {
            products,
            coupons,
            billing,
            shipping,
            customerNote,
            shippingPrice,
            ...params
        } = req.body;

        //Configurations
        const configurations = await getBusinessConfigCache(business.id);

        const online_shop_area_stock = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;

        const order_notification_users = configurations.find(
            item => item.key === "order_notification_users"
        );
        const onlineShopPriceSystems =
            configurations
                .find(item => item.key === "online_shop_price_system")
                ?.value.split(",") || [];

        const enable_delivery =
            configurations.find(item => item.key === "enable_delivery")
                ?.value === "true";

        const enable_to_sale_in_negative =
            configurations.find(
                item => item.key === "enable_to_sale_in_negative"
            )?.value === "true";

        const create_order_in_status = configurations.find(
            item => item.key === "create_order_in_status"
        )?.value;

        if (!params.pickUpInStore && enable_delivery && !shippingPrice) {
            t.rollback();
            return res.status(400).json({
                message: `Este negocio ha definido como obligatorio el precio de envío. Debe establecer uno.`,
            });
        }

        //Analyzing cache for configurations
        const availableCurrencies = await getCurrenciesCache(business.id);

        const main_currency = availableCurrencies.find(item => item.isMain);
        if (!main_currency) {
            return res.status(404).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        //Finding associated customer
        const client = await Client.findOne({
            where: {
                businessId: business.id,
                userId: user.id,
            },
        });

        let clientId = client?.id;
        if (!client) {
            const new_client = Client.build({
                businessId: business.id,
                userId: user.id,
                email: user.email,
                firstName: user.displayName?.split(" ")[0] || null,
                lastName: user.displayName?.split(" ")[1] || null,
            });

            await new_client.save({ transaction: t });

            clientId = new_client.id;
        }

        //Analyzing paymentgateway
        const paymentGateway = await PaymentGateway.findOne({
            where: {
                id: params.paymentGatewayId,
                businessId: business.id,
            },
        });

        if (!paymentGateway) {
            t.rollback();
            return res.status(400).json({
                message: `La pasarela de pago introducida no fue encontrada en el negocio actual. Por favor, contacte al administrador.`,
            });
        }

        let status = "PAYMENT_PENDING";
        if (
            create_order_in_status &&
            ["CREATED", "PAYMENT_PENDING"].includes(create_order_in_status)
        ) {
            status = create_order_in_status;
        }

        let orderTemplate: any = {
            status: "PAYMENT_PENDING",
            businessId: business.id,
            customerNote,
            origin: "marketplace",
            clientId,
            pickUpInStore: params.pickUpInStore,
            deliveryAt: params.deliveryAt,
            paymentGatewayId: params.paymentGatewayId,
            managedById: user.id,
            shipping,
            billing,
        };

        if (shippingPrice) {
            if (shippingPrice.codeCurrency === definedCodeCurrency) {
                orderTemplate.shippingPrice = {
                    amount: shippingPrice.amount,
                    codeCurrency: shippingPrice.codeCurrency,
                };
            } else {
                const convertedPrice = exchangeCurrency(
                    shippingPrice,
                    definedCodeCurrency,
                    availableCurrencies,
                    2
                );

                if (convertedPrice) {
                    orderTemplate.shippingPrice = {
                        amount: convertedPrice.amount,
                        codeCurrency: convertedPrice.codeCurrency,
                    };
                }
            }
        }

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Registering actions
        let listBulkOrderReceipt = [
            {
                action: "ORDER_CREATED",
                title: getTitleOrderRecord("ORDER_CREATED"),
                isPublic: true,
                madeById: user.id,
            },
        ];

        await redisClient.set(
            getEphimeralTermKey(business.id, "records", tId),
            JSON.stringify(listBulkOrderReceipt),
            {
                EX: getExpirationTime("records"),
            }
        );

        //1. Normalize products to Sell and register
        const productsToSell: Array<ItemProductSelled> = [];
        products.forEach((element: any) => {
            productsToSell.push({
                productId: Number(element.productId),
                quantity: Number(element.quantity),
                variationId: element.variationId,
                addons: element.addons,
            });
        });

        const result = await substractProductStockDisponibility(
            {
                products: productsToSell,
                stockAreaId: Number(online_shop_area_stock),
                businessId: business.id,
                strict: !enable_to_sale_in_negative,
            },
            t
        );
        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                origin: "newOnlineOrderV2/substractProductStockDisponibility",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        //Generals
        let addBulkSelledProduct: Array<any> = [];
        let listProductsToRecord = [];
        let generalTotalCost = 0;

        const productsFound = await getStoreProductsCache(business.id, tId);

        //Obtaining all variations
        const idsVariations = productsToSell
            .filter(item => item.variationId)
            .map(item => item.variationId);

        let foundVariations: Array<Variation> = [];
        if (idsVariations.length !== 0) {
            foundVariations = await Variation.findAll({
                where: {
                    id: idsVariations,
                },
            });
        }

        for (const selledProduct of productsToSell) {
            //Analyzing if where found
            const productDetails = productsFound.find(
                item => item.id === selledProduct.productId
            );

            if (!productDetails) {
                return {
                    status: 404,
                    message: `El producto con id ${selledProduct.productId} no fue encontrado.`,
                };
            }

            if (
                ![
                    "MENU",
                    "ADDON",
                    "SERVICE",
                    "COMBO",
                    "STOCK",
                    "VARIATION",
                ].includes(productDetails.type)
            ) {
                return {
                    status: 400,
                    message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
                };
            }

            //Generals
            let productionAreaId: number | undefined;
            if (
                productDetails.listProductionAreas &&
                productDetails.listProductionAreas.length !== 0
            ) {
                if (productDetails.listProductionAreas.length === 1) {
                    productionAreaId = productDetails.listProductionAreas[0].id;
                } else {
                    const found = productDetails.listProductionAreas.find(
                        element => element.id === selledProduct.productionAreaId
                    );

                    if (found) {
                        productionAreaId = found.id;
                    }
                }
            }

            //Calculate itemCost
            let totalSelledCost = mathOperation(
                productDetails.averageCost,
                selledProduct.quantity,
                "multiplication",
                2
            );

            //If it is available, creating a virtual selledProduct
            let selled_product: any = {
                name: productDetails.name,
                measure: productDetails.measure,
                colorCategory: productDetails.salesCategory?.color,
                quantity: selledProduct.quantity,
                productId: productDetails.id,
                type: productDetails.type,
                productionAreaId: productionAreaId,
                addons: [],
                variationId: selledProduct.variationId,
                supplierId: productDetails.supplierId,
            };

            if (productDetails.type === "VARIATION") {
                const variation = foundVariations.find(
                    item => item.id === selledProduct.variationId
                );

                if (!variation) {
                    return {
                        status: 404,
                        message: `La variación del producto ${productDetails.name} no fue encontrada.`,
                    };
                }

                if (variation.imageId) {
                    selled_product.imageId = variation.imageId;
                } else {
                    selled_product.imageId = productDetails.images?.[0]?.id;
                }
            } else {
                selled_product.imageId = productDetails.images?.[0]?.id;
            }

            //Finding product price
            let itemPrice = getProductPrice(
                productDetails,
                selledProduct.variationId,
                availableCurrencies,
                onlineShopPriceSystems,
                definedCodeCurrency
            );

            if (!itemPrice) {
                return {
                    status: 404,
                    message: `El producto ${productDetails.name} no tiene un precio válido. Consulte al administrador.`,
                };
            }

            let totalSelledPrice = mathOperation(
                itemPrice.amount,
                selledProduct.quantity,
                "multiplication",
                3
            );
            totalSelledPrice = truncateValue(totalSelledPrice, 2);

            selled_product = {
                ...selled_product,
                priceUnitary: {
                    amount: itemPrice.amount,
                    codeCurrency: itemPrice.codeCurrency,
                },
                priceTotal: {
                    amount: totalSelledPrice,
                    codeCurrency: itemPrice.codeCurrency,
                },
            };
            let addAddonsBulk: any = [];

            //Analizing if addons received
            if (selledProduct.addons && selledProduct.addons?.length !== 0) {
                if (!["MENU", "SERVICE"].includes(productDetails.type)) {
                    return {
                        status: 400,
                        message: `Solo los productos de tipo Menú/Servicio pueden contener agregos. Agrego en ${productDetails.name} no válido.`,
                    };
                }

                let listProductWithAddonToRecord = [];

                for (const addon of selledProduct.addons) {
                    const addon_found = productDetails.availableAddons?.find(
                        item => item.id === addon.id
                    );

                    if (!addon_found) {
                        return {
                            status: 404,
                            message: `El agrego con id ${addon.id} ya no se encuentra disponible en el producto ${productDetails.name}.`,
                        };
                    }

                    //Calculate addon the cost
                    totalSelledCost += addon_found.averageCost;

                    listProductWithAddonToRecord.push(
                        `+(x${addon.quantity}) ${addon_found.name}`
                    );

                    //Obtaining price of product
                    const addonPrice = getProductPrice(
                        addon_found,
                        undefined,
                        availableCurrencies,
                        onlineShopPriceSystems,
                        definedCodeCurrency
                    );

                    if (!addonPrice) {
                        return {
                            status: 400,
                            message: `El precio del producto ${addon_found.name} no fue encontrado. Por favor consule al propietario de negocio.`,
                        };
                    }

                    addAddonsBulk.push({
                        productId: addon.id,
                        quantity: addon.quantity,
                        price: {
                            amount: addonPrice.amount,
                            codeCurrency: addonPrice.codeCurrency,
                        },
                        name: addon_found.name,
                    });
                }

                listProductsToRecord.push(
                    `(x${selledProduct.quantity}) ${
                        productDetails.name
                    } ${listProductWithAddonToRecord.join(", ")}`
                );
            } else {
                //If not addons
                listProductsToRecord.push(
                    `(x${selledProduct.quantity}) ${productDetails.name}`
                );
            }

            if (
                ["MENU", "ADDON", "SERVICE", "COMBO"].includes(
                    productDetails.type
                )
            ) {
                selled_product.status = "RECEIVED";
            } else {
                selled_product.status = "COMPLETED";
                selled_product.areaId = Number(online_shop_area_stock);
            }

            //Adding selled product to the virtual store for creating at the end and updating total price
            addBulkSelledProduct.push({
                ...selled_product,
                totalCost: totalSelledCost,
                addons: addAddonsBulk,
            });

            generalTotalCost += totalSelledCost;
        }

        orderTemplate.selledProducts = addBulkSelledProduct;

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Checking and registering coupons
        if (coupons && coupons.length !== 0) {
            const result_coupons = await processCoupons({
                coupons,
                listProducts: productsToSell,
                priceSystem: onlineShopPriceSystems,
                businessId: business.id,
                userId: user?.id,
                codeCurrencyDefined: definedCodeCurrency,
            });

            if (!internalCheckerResponse(result_coupons)) {
                t.rollback();
                Logger.error(
                    result_coupons.message ||
                        "Ha ocurrido un error inesperado.",
                    {
                        origin: "newOnlineOrder/processCoupons",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result_coupons.status).json({
                    message: result_coupons.message,
                });
            }

            //Registering in order and desecadenating actions
            if (result_coupons.data.listCoupons.length !== 0) {
                //Found and block coupons
                const coupons = await Coupon.findAll({
                    where: {
                        id: result_coupons.data.listCoupons,
                    },
                    lock: true,
                    transaction: t,
                });

                const listUsedBulk = [];
                for (const coupon of coupons) {
                    coupon.usageCount++;
                    await coupon.save({ transaction: t });

                    if (result_coupons.data.client) {
                        listUsedBulk.push({
                            clientId: result_coupons.data.client.id,
                            couponId: coupon.id,
                        });
                    }
                }

                if (listUsedBulk.length !== 0) {
                    await ListUsedClientsCoupon.bulkCreate(listUsedBulk, {
                        transaction: t,
                    });
                }

                const listBulk = result_coupons.data.listCoupons.map(
                    (item: number) => {
                        return {
                            couponId: item,
                        };
                    }
                );

                orderTemplate.coupons = listBulk;
            }

            if (result_coupons.data.couponDiscount.length !== 0) {
                //First position. In the future could be more than one
                const priceDiscount = result_coupons.data.couponDiscount[0];

                //Registering discount
                if (orderTemplate.couponDiscountPrice) {
                    orderTemplate.couponDiscountPrice.amount =
                        priceDiscount.amount;
                    orderTemplate.couponDiscountPrice.codeCurrency =
                        priceDiscount.codeCurrency;
                } else {
                    orderTemplate.couponDiscountPrice = priceDiscount;
                }
            }

            await redisClient.set(
                getEphimeralTermKey(business.id, "orderCoupon", tId),
                JSON.stringify(coupons),
                {
                    EX: getExpirationTime("orderCoupon"),
                }
            );

            //Updating cache
            await redisClient.set(
                getEphimeralTermKey(business.id, "order", tId),
                JSON.stringify(orderTemplate),
                {
                    EX: getExpirationTime("order"),
                }
            );
        }

        //Checking stability of products
        if (products.length === 0) {
            t.rollback();
            return res.status(400).json({
                message: `Se ha recibido la orden sin productos. Por favor, vuelva a intentarlo.`,
            });
        }

        if (products.length !== orderTemplate.selledProducts.length) {
            t.rollback();
            return res.status(400).json({
                message: `Todos los productos de la orden no fueron encontrados. Por favor, revise su pedido y vuelva a intentarlo.`,
            });
        }

        //Setting totals
        const result_totals = await calculateOrderTotal(
            orderTemplate.businessId,
            t
        );

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newOnlineOrder/calculateOrderTotal",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        //Obtain the last operationNumber
        let lastOperationNumber: number = await OrderReceipt.max(
            "operationNumber",
            {
                where: {
                    businessId: business.id,
                    createdAt: {
                        [Op.gte]: moment(new Date())
                            .startOf("year")
                            .format("YYYY-MM-DD HH:mm"),
                    },
                },
            }
        );

        if (!lastOperationNumber) {
            lastOperationNumber = 1;
        } else {
            lastOperationNumber += 1;
        }

        orderTemplate = await getOrderFromCacheTransaction(business.id, tId);
        orderTemplate.operationNumber = lastOperationNumber;
        orderTemplate.totalToPay = result_totals.data.totalToPay;

        const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
            include: [
                OrderReceiptPrice,
                OrderReceiptTotal,
                { model: Price, as: "tipPrice" },
                { model: Price, as: "couponDiscountPrice" },
                { model: Price, as: "shippingPrice" },
                BillingAddress,
                ShippingAddress,
                {
                    model: SelledProduct,
                    include: [
                        {
                            model: SelledProductAddon,
                            as: "addons",
                            include: [{ model: Price, as: "priceUnitary" }],
                        },
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                    ],
                },
            ],
        });

        await order.save({ transaction: t });

        //Analyzing if coupons must be updated
        if (orderTemplate.coupons && orderTemplate.coupons.length !== 0) {
            await OrderReceiptCoupon.bulkCreate(
                orderTemplate.coupons.map((item: any) => {
                    return {
                        ...item,
                        orderReceiptId: order.id,
                    };
                }),
                {
                    transaction: t,
                }
            );
        }

        await t.commit();

        //Preparing data to return
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope(
            "public_return"
        ).findByPk(order.id);

        res.status(200).json(order_to_emit);

        const listCacheRecords = await getOrderRecordsCache(business.id, tId);
        if (listCacheRecords.length !== 0) {
            orderQueue.add(
                {
                    code: "REGISTER_RECORDS",
                    params: {
                        records: listCacheRecords,
                        orderId: order.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: result.data.affectedProducts,
                    businessId: business.id,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        if (!order_to_emit) return;

        //Send mail
        let listToNotify: Array<{ email: string; isOwner: boolean }> = [];

        //Client
        if (order_to_emit.client?.email || user.email) {
            listToNotify.push({
                email: order_to_emit.client?.email || user.email,
                isOwner: false,
            });
        }

        //Shipping
        if (order_to_emit.shipping?.email) {
            const found = listToNotify.find(
                item => item.email === order_to_emit.shipping.email
            );
            if (!found) {
                listToNotify.push({
                    email: order_to_emit.shipping.email,
                    isOwner: false,
                });
            }
        }

        //Billing
        if (order_to_emit.billing?.email) {
            const found = listToNotify.find(
                item => item.email === order_to_emit.billing.email
            );
            if (!found) {
                listToNotify.push({
                    email: order_to_emit.billing.email,
                    isOwner: false,
                });
            }
        }

        //Business notifications
        if (order_notification_users?.value) {
            const userToNotification =
                order_notification_users.value.split(",") || [];

            for (const email of userToNotification) {
                const found = listToNotify.find(item => item.email === email);
                if (!found) {
                    listToNotify.push({
                        email,
                        isOwner: true,
                    });
                }
            }
        }

        for (const sender of listToNotify) {
            emailQueue.add(
                {
                    code: "NEW_ORDER_NOTIFICATION",
                    params: {
                        email: sender.email,
                        order_to_emit,
                        business,
                        isOwner: sender.isOwner,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const newPreOnlineOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    const definedCodeCurrency = req.header("X-Shop-CodeCurrency");
    const order_origin: app_origin = req.header("X-App-Origin");

    //@ts-ignore
    const tId = t.id;

    try {
        const user: User = req.user;
        const business: Business = req.business;
        const {
            products,
            coupons,
            billing,
            shipping,
            customerNote,
            shippingPrice,
            ...params
        } = req.body;

        //Configurations
        const configurations = await getBusinessConfigCache(business.id);

        const order_notification_users = configurations.find(
            item => item.key === "order_notification_users"
        );

        const onlineShopPriceSystem =
            configurations
                .find(item => item.key === "online_shop_price_system")
                ?.value.split(",") || [];

        const enable_delivery =
            configurations.find(item => item.key === "enable_delivery")
                ?.value === "true";

        if (!params.pickUpInStore && enable_delivery && !shippingPrice) {
            t.rollback();
            return res.status(400).json({
                message: `Este negocio ha definido como obligatorio el precio de envío. Debe establecer uno.`,
            });
        }

        //Analyzing cache for configurations
        const availableCurrencies = await getCurrenciesCache(business.id);

        const main_currency = availableCurrencies.find(item => item.isMain);
        if (!main_currency) {
            return res.status(404).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        //Finding associated customer
        const client = await Client.findOne({
            where: {
                businessId: business.id,
                userId: user.id,
            },
            include: [
                Address,
                {
                    model: Phone,
                    attributes: [
                        "number",
                        "description",
                        "isMain",
                        "isAvailable",
                    ],
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        let clientId = client?.id;
        if (!client) {
            const new_client = Client.build({
                businessId: business.id,
                userId: user.id,
                email: user.email,
                firstName: user.displayName?.split(" ")[0] || null,
                lastName: user.displayName?.split(" ")[1] || null,
            });

            await new_client.save({ transaction: t });

            clientId = new_client.id;
        }

        let orderTemplate: any = {
            status: "CREATED",
            businessId: business.id,
            managedById: user.id,
            customerNote,
            origin: "markeplace",
            clientId: client?.id,
            pickUpInStore: params.pickUpInStore,
            deliveryAt: params.deliveryAt,
            isPreReceipt: true,
            shipping,
            billing,
        };

        //Updating client data in case is billing the first time
        // if (billing && !client?.address) {
        //     const newAddress = Address.build({
        //         street_1: billing.street_1,
        //         street_2: billing.street_1,
        //         description: billing.description,
        //         municipalityId: billing.municipalityId,
        //         provinceId: billing.provinceId,
        //         countryId: billing.countryId
        //     });

        //     await newAddress.save({ transaction: t });
        //     client.addressId = newAddress.id;
        // }

        if (shippingPrice) {
            if (shippingPrice.codeCurrency === definedCodeCurrency) {
                orderTemplate.shippingPrice = {
                    amount: shippingPrice.amount,
                    codeCurrency: shippingPrice.codeCurrency,
                };
            } else {
                const convertedPrice = exchangeCurrency(
                    shippingPrice,
                    definedCodeCurrency,
                    availableCurrencies
                );

                if (convertedPrice) {
                    orderTemplate.shippingPrice = {
                        amount: convertedPrice.amount,
                        codeCurrency: convertedPrice.codeCurrency,
                    };
                }
            }
        }

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Registering actions
        let listBulkOrderReceipt = [
            {
                action: "ORDER_CREATED",
                title: getTitleOrderRecord("ORDER_CREATED"),
                isPublic: true,
                userId: user.id,
            },
        ];

        await redisClient.set(
            getEphimeralTermKey(business.id, "records", tId),
            JSON.stringify(listBulkOrderReceipt),
            {
                EX: getExpirationTime("records"),
            }
        );

        //1. Normalize products to Sell and register
        const productsToSell: Array<ItemProductSelled> = [];
        products.forEach((element: any) => {
            productsToSell.push({
                productId: Number(element.productId),
                quantity: Number(element.quantity),
                variationId: element.variationId,
                addons: element.addons,
            });
        });

        //Generals
        let addBulkSelledProduct: Array<any> = [];
        let listProductsToRecord = [];
        let generalTotalCost = 0;

        //Finding and dividing products according type
        const ids = products.map((item: any) => item.productId);

        const productsFound = await Product.findAll({
            where: { id: ids },
            include: [
                {
                    model: Product,
                    as: "availableAddons",
                    through: {
                        attributes: [],
                    },
                    include: [
                        {
                            model: ProductPrice,
                            attributes: [
                                "id",
                                "price",
                                "codeCurrency",
                                "isMain",
                                "priceSystemId",
                            ],
                        },
                        {
                            model: Price,
                            as: "onSalePrice",
                            attributes: ["codeCurrency", "amount"],
                        },
                    ],
                },
                SalesCategory,
                {
                    model: ProductPrice,
                    attributes: [
                        "id",
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                    ],
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Price,
                    as: "onSalePrice",
                    attributes: ["codeCurrency", "amount"],
                },
                {
                    model: Variation,
                    as: "variations",
                    separate: true,
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                    ],
                },
            ],
            transaction: t,
        });

        //Obtaining all variations
        const idsVariations = productsToSell
            .filter(item => item.variationId)
            .map(item => item.variationId);

        let foundVariations: Array<Variation> = [];
        if (idsVariations.length !== 0) {
            foundVariations = await Variation.findAll({
                where: {
                    id: idsVariations,
                },
            });
        }

        for (const selledProduct of productsToSell) {
            //Analyzing if where found
            const productDetails = productsFound.find(
                item => item.id === selledProduct.productId
            );

            if (!productDetails) {
                return {
                    status: 404,
                    message: `El producto con id ${selledProduct.productId} no fue encontrado.`,
                };
            }

            if (
                ![
                    "MENU",
                    "ADDON",
                    "SERVICE",
                    "COMBO",
                    "STOCK",
                    "VARIATION",
                ].includes(productDetails.type)
            ) {
                return {
                    status: 400,
                    message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
                };
            }

            //Calculate itemCost
            let totalSelledCost = mathOperation(
                productDetails.averageCost,
                selledProduct.quantity,
                "multiplication",
                2
            );

            //If it is available, creating a virtual selledProduct
            let selled_product: any = {
                name: productDetails.name,
                measure: productDetails.measure,
                colorCategory: productDetails.salesCategory?.color,
                quantity: selledProduct.quantity,
                productId: productDetails.id,
                type: productDetails.type,
                addons: [],
                variationId: selledProduct.variationId,
                supplierId: productDetails.supplierId,
            };

            if (productDetails.type === "VARIATION") {
                const variation = foundVariations.find(
                    item => item.id === selledProduct.variationId
                );

                if (!variation) {
                    return {
                        status: 404,
                        message: `La variación del producto ${productDetails.name} no fue encontrada.`,
                    };
                }

                if (variation.imageId) {
                    selled_product.imageId = variation.imageId;
                } else {
                    selled_product.imageId = productDetails.images?.[0]?.id;
                }
            } else {
                selled_product.imageId = productDetails.images?.[0]?.id;
            }

            //Finding product price
            let itemPrice = getProductPrice(
                productDetails,
                selledProduct.variationId,
                availableCurrencies,
                onlineShopPriceSystem,
                definedCodeCurrency
            );

            if (!itemPrice) {
                return {
                    status: 404,
                    message: `El producto ${productDetails.name} no tiene un precio válido. Consulte al administrador.`,
                };
            }

            let totalSelledPrice = mathOperation(
                itemPrice.amount,
                selledProduct.quantity,
                "multiplication",
                3
            );
            totalSelledPrice = truncateValue(totalSelledPrice, 2);

            selled_product = {
                ...selled_product,
                priceUnitary: {
                    amount: itemPrice.amount,
                    codeCurrency: itemPrice.codeCurrency,
                },
                priceTotal: {
                    amount: totalSelledPrice,
                    codeCurrency: itemPrice.codeCurrency,
                },
            };
            let addAddonsBulk: any = [];

            //Analizing if addons received
            if (selledProduct.addons && selledProduct.addons?.length !== 0) {
                if (!["MENU", "SERVICE"].includes(productDetails.type)) {
                    return {
                        status: 400,
                        message: `Solo los productos de tipo Menú/Servicio pueden contener agregos. Agrego en ${productDetails.name} no válido.`,
                    };
                }

                let listProductWithAddonToRecord = [];

                for (const addon of selledProduct.addons) {
                    const addon_found = productDetails.availableAddons?.find(
                        item => item.id === addon.id
                    );

                    if (!addon_found) {
                        return {
                            status: 404,
                            message: `El agrego con id ${addon.id} ya no se encuentra disponible en el producto ${productDetails.name}.`,
                        };
                    }

                    //Calculate addon the cost
                    totalSelledCost += addon_found.averageCost;

                    listProductWithAddonToRecord.push(
                        `+(x${addon.quantity}) ${addon_found.name}`
                    );

                    //Obtaining price of product
                    const addonPrice = getProductPrice(
                        addon_found,
                        undefined,
                        availableCurrencies,
                        onlineShopPriceSystem,
                        definedCodeCurrency
                    );

                    if (!addonPrice) {
                        return {
                            status: 400,
                            message: `El precio del producto ${addon_found.name} no fue encontrado. Por favor consule al propietario de negocio.`,
                        };
                    }

                    addAddonsBulk.push({
                        productId: addon.id,
                        quantity: addon.quantity,
                        price: {
                            amount: addonPrice.amount,
                            codeCurrency: addonPrice.codeCurrency,
                        },
                        name: addon_found.name,
                    });
                }

                listProductsToRecord.push(
                    `(x${selledProduct.quantity}) ${
                        productDetails.name
                    } ${listProductWithAddonToRecord.join(", ")}`
                );
            } else {
                //If not addons
                listProductsToRecord.push(
                    `(x${selledProduct.quantity}) ${productDetails.name}`
                );
            }

            if (
                ["MENU", "ADDON", "SERVICE", "COMBO"].includes(
                    productDetails.type
                )
            ) {
                selled_product.status = "RECEIVED";
            } else {
                selled_product.status = "COMPLETED";
            }

            //Adding selled product to the virtual store for creating at the end and updating total price
            addBulkSelledProduct.push({
                ...selled_product,
                totalCost: totalSelledCost,
                addons: addAddonsBulk,
            });

            generalTotalCost += totalSelledCost;
        }

        orderTemplate.selledProducts = addBulkSelledProduct;

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Checking and registering coupons
        if (coupons && coupons.length !== 0) {
            const result_coupons = await processCoupons({
                coupons,
                listProducts: productsToSell,
                priceSystem: onlineShopPriceSystem,
                businessId: business.id,
                userId: user?.id,
                codeCurrencyDefined: definedCodeCurrency,
            });

            if (!internalCheckerResponse(result_coupons)) {
                t.rollback();
                Logger.error(
                    result_coupons.message ||
                        "Ha ocurrido un error inesperado.",
                    {
                        origin: "newOnlineOrder/processCoupons",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result_coupons.status).json({
                    message: result_coupons.message,
                });
            }

            //Registering in order and desecadenating actions
            if (result_coupons.data.listCoupons.length !== 0) {
                //Found and block coupons
                const coupons = await Coupon.findAll({
                    where: {
                        id: result_coupons.data.listCoupons,
                    },
                    lock: true,
                    transaction: t,
                });

                const listUsedBulk = [];
                for (const coupon of coupons) {
                    coupon.usageCount++;
                    await coupon.save({ transaction: t });

                    if (result_coupons.data.client) {
                        listUsedBulk.push({
                            clientId: result_coupons.data.client.id,
                            couponId: coupon.id,
                        });
                    }
                }

                if (listUsedBulk.length !== 0) {
                    await ListUsedClientsCoupon.bulkCreate(listUsedBulk, {
                        transaction: t,
                    });
                }

                const listBulk = result_coupons.data.listCoupons.map(
                    (item: number) => {
                        return {
                            couponId: item,
                        };
                    }
                );

                orderTemplate.coupons = listBulk;
            }

            if (result_coupons.data.couponDiscount.length !== 0) {
                //First position. In the future could be more than one
                const priceDiscount = result_coupons.data.couponDiscount[0];

                //Registering discount
                if (orderTemplate.couponDiscountPrice) {
                    orderTemplate.couponDiscountPrice.amount =
                        priceDiscount.amount;
                    orderTemplate.couponDiscountPrice.codeCurrency =
                        priceDiscount.codeCurrency;
                } else {
                    orderTemplate.couponDiscountPrice = priceDiscount;
                }
            }

            await redisClient.set(
                getEphimeralTermKey(business.id, "orderCoupon", tId),
                JSON.stringify(coupons),
                {
                    EX: getExpirationTime("orderCoupon"),
                }
            );

            //Updating cache
            await redisClient.set(
                getEphimeralTermKey(business.id, "order", tId),
                JSON.stringify(orderTemplate),
                {
                    EX: getExpirationTime("order"),
                }
            );
        }

        //Checking stability of products
        if (products.length === 0) {
            t.rollback();
            return res.status(400).json({
                message: `Se ha recibido la orden sin productos. Por favor, vuelva a intentarlo.`,
            });
        }

        if (products.length !== orderTemplate.selledProducts.length) {
            t.rollback();
            return res.status(400).json({
                message: `Todos los productos de la orden no fueron encontrados. Por favor, revise su pedido y vuelva a intentarlo.`,
            });
        }

        //Setting totals
        const result_totals = await calculateOrderTotal(
            orderTemplate.businessId,
            t
        );

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newOnlineOrder/calculateOrderTotal",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        //Obtain the last operationNumber
        let lastPreOperationNumber: number = await OrderReceipt.max(
            "preOperationNumber",
            {
                where: {
                    businessId: business.id,
                    createdAt: {
                        [Op.gte]: moment(new Date())
                            .startOf("year")
                            .format("YYYY-MM-DD HH:mm"),
                    },
                },
            }
        );

        if (!lastPreOperationNumber) {
            lastPreOperationNumber = 1;
        } else {
            lastPreOperationNumber += 1;
        }

        orderTemplate = await getOrderFromCacheTransaction(business.id, tId);

        orderTemplate.preOperationNumber = lastPreOperationNumber;
        orderTemplate.operationNumber = null;

        const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
            include: [
                OrderReceiptPrice,
                OrderReceiptTotal,
                { model: Price, as: "tipPrice" },
                { model: Price, as: "couponDiscountPrice" },
                { model: Price, as: "shippingPrice" },
                BillingAddress,
                ShippingAddress,
                {
                    model: SelledProduct,
                    include: [
                        {
                            model: SelledProductAddon,
                            as: "addons",
                            include: [{ model: Price, as: "priceUnitary" }],
                        },
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                    ],
                },
            ],
        });

        await order.save({ transaction: t });

        //Analyzing if coupons must be updated
        if (orderTemplate.coupons && orderTemplate.coupons.length !== 0) {
            await OrderReceiptCoupon.bulkCreate(
                orderTemplate.coupons.map((item: any) => {
                    return {
                        ...item,
                        orderReceiptId: order.id,
                    };
                }),
                {
                    transaction: t,
                }
            );
        }

        //Preparing data to return
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope(
            "public_return"
        ).findByPk(order.id, {
            transaction: t,
        });

        await t.commit();
        res.status(200).json(order_to_emit);

        const listCacheRecords = await getOrderRecordsCache(business.id, tId);
        if (listCacheRecords.length !== 0) {
            orderQueue.add(
                {
                    code: "REGISTER_RECORDS",
                    params: {
                        records: listCacheRecords,
                        orderId: order.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (!order_to_emit) return;

        //Send mail
        let listToNotify: Array<{ email: string; isOwner: boolean }> = [];

        //Client
        if (order_to_emit.client?.email || user.email) {
            listToNotify.push({
                email: order_to_emit.client?.email || user.email,
                isOwner: false,
            });
        }

        //Shipping
        if (order_to_emit.shipping?.email) {
            const found = listToNotify.find(
                item => item.email === order_to_emit.shipping.email
            );
            if (!found) {
                listToNotify.push({
                    email: order_to_emit.shipping.email,
                    isOwner: false,
                });
            }
        }

        //Billing
        if (order_to_emit.billing?.email) {
            const found = listToNotify.find(
                item => item.email === order_to_emit.billing.email
            );
            if (!found) {
                listToNotify.push({
                    email: order_to_emit.billing.email,
                    isOwner: false,
                });
            }
        }

        //Business notifications
        if (order_notification_users?.value) {
            const userToNotification =
                order_notification_users.value.split(",") || [];

            for (const email of userToNotification) {
                const found = listToNotify.find(item => item.email === email);
                if (!found) {
                    listToNotify.push({
                        email,
                        isOwner: true,
                    });
                }
            }
        }

        for (const sender of listToNotify) {
            emailQueue.add(
                {
                    code: "NEW_ORDER_NOTIFICATION",
                    params: {
                        email: sender.email,
                        order_to_emit,
                        business,
                        isOwner: sender.isOwner,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const newMarketPlaceOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    const definedCodeCurrency = req.header("X-Shop-CodeCurrency");

    //@ts-ignore
    const tId = t.id;

    try {
        const user: User = req.user;
        const business: Business = req.business;
        const {
            products,
            coupons,
            billing,
            shipping,
            customerNote,
            shippingPrice,
            ...params
        } = req.body;

        //Configurations
        const configurations = await getBusinessConfigCache(business.id);

        const online_shop_area_stock = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;
        const order_notification_users = configurations.find(
            item => item.key === "order_notification_users"
        );
        const onlineShopPriceSystems =
            configurations
                .find(item => item.key === "online_shop_price_system")
                ?.value.split(",") || [];

        const force_consecutive_invoice_numbers =
            configurations.find(
                item => item.key === "force_consecutive_invoice_numbers"
            )?.value === "true";
        const enable_delivery =
            configurations.find(item => item.key === "enable_delivery")
                ?.value === "true";

        if (!params.pickUpInStore && enable_delivery && !shippingPrice) {
            t.rollback();
            return res.status(400).json({
                message: `Este negocio ha definido como obligatorio el precio de envío. Debe establecer uno.`,
            });
        }

        //Finding associated customer
        const client = await Client.findOne({
            where: {
                businessId: business.id,
                userId: user.id,
            },
        });

        let clientId = client?.id;
        if (!client) {
            const new_client = Client.build({
                businessId: business.id,
                userId: user.id,
                email: user.email,
                firstName: user.displayName?.split(" ")[0] || null,
                lastName: user.displayName?.split(" ")[1] || null,
            });

            await new_client.save({ transaction: t });

            clientId = new_client.id;
        }

        //Analyzing paymentgateway
        const paymentGateway = await PaymentGateway.findOne({
            where: {
                id: params.paymentGatewayId,
                businessId: business.id,
            },
        });

        if (!paymentGateway) {
            t.rollback();
            return res.status(400).json({
                message: `La pasarela de pago introducida no fue encontrada en el negocio actual. Por favor, contacte al administrador.`,
            });
        }

        let orderStatus: order_receipt_status = "CREATED";
        switch (paymentGateway.code) {
            case "G_TROPIPAY":
            case "G_CHEQUE":
                orderStatus = "PAYMENT_PENDING";
                break;
        }

        let orderTemplate: any = {
            status: orderStatus,
            businessId: business.id,
            customerNote,
            origin: "marketplace",
            clientId,
            pickUpInStore: params.pickUpInStore,
            deliveryAt: params.deliveryAt,
            paymentGatewayId: params.paymentGatewayId,
            managedById: user.id,
            shipping,
            billing,
        };

        if (shippingPrice) {
            orderTemplate.shippingPrice = {
                amount: shippingPrice.amount,
                codeCurrency: shippingPrice.codeCurrency,
            };
        }

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Registering actions
        let listBulkOrderReceipt = [
            {
                action: "ORDER_CREATED",
                title: getTitleOrderRecord("ORDER_CREATED"),
                isPublic: true,
                madeById: user.id,
            },
        ];

        await redisClient.set(
            getEphimeralTermKey(business.id, "records", tId),
            JSON.stringify(listBulkOrderReceipt),
            {
                EX: getExpirationTime("records"),
            }
        );

        //1. Normalize products to Sell and register
        const productsToSell: Array<ItemProductSelled> = [];
        products.forEach((element: any) => {
            productsToSell.push({
                productId: Number(element.productId),
                quantity: Number(element.quantity),
                variationId: element.variationId,
                addons: element.addons,
            });
        });

        const result = await registerSelledProductInOrder(
            {
                productsToSell,
                stockAreaId: Number(online_shop_area_stock),
                businessId: business.id,
                origin: "marketplace",
                userId: user.id,
                priceCodeCurrency: definedCodeCurrency,
            },
            t
        );

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                origin: "newOnlineOrder/registerSelledProductInOrder",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        //Updating order from cache
        orderTemplate = await getOrderFromCacheTransaction(business.id, tId);

        //Checking and registering coupons
        if (coupons && coupons.length !== 0) {
            const result_coupons = await processCoupons({
                coupons,
                listProducts: productsToSell,
                priceSystem: onlineShopPriceSystems,
                businessId: business.id,
                userId: user?.id,
                codeCurrencyDefined: definedCodeCurrency,
            });

            if (!internalCheckerResponse(result_coupons)) {
                t.rollback();
                Logger.error(
                    result_coupons.message ||
                        "Ha ocurrido un error inesperado.",
                    {
                        origin: "newOnlineOrder/processCoupons",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result_coupons.status).json({
                    message: result_coupons.message,
                });
            }

            //Registering in order and desecadenating actions
            if (result_coupons.data.listCoupons.length !== 0) {
                //Found and block coupons
                const coupons = await Coupon.findAll({
                    where: {
                        id: result_coupons.data.listCoupons,
                    },
                    lock: true,
                    transaction: t,
                });

                const listUsedBulk = [];
                for (const coupon of coupons) {
                    coupon.usageCount++;
                    await coupon.save({ transaction: t });

                    if (result_coupons.data.client) {
                        listUsedBulk.push({
                            clientId: result_coupons.data.client.id,
                            couponId: coupon.id,
                        });
                    }
                }

                if (listUsedBulk.length !== 0) {
                    await ListUsedClientsCoupon.bulkCreate(listUsedBulk, {
                        transaction: t,
                    });
                }

                const listBulk = result_coupons.data.listCoupons.map(
                    (item: number) => {
                        return {
                            couponId: item,
                        };
                    }
                );

                orderTemplate.coupons = listBulk;
            }

            if (result_coupons.data.couponDiscount.length !== 0) {
                //First position. In the future could be more than one
                const priceDiscount = result_coupons.data.couponDiscount[0];

                //Registering discount
                if (orderTemplate.couponDiscountPrice) {
                    orderTemplate.couponDiscountPrice.amount =
                        priceDiscount.amount;
                    orderTemplate.couponDiscountPrice.codeCurrency =
                        priceDiscount.codeCurrency;
                } else {
                    orderTemplate.couponDiscountPrice = priceDiscount;
                }
            }

            await redisClient.set(
                getEphimeralTermKey(business.id, "orderCoupon", tId),
                JSON.stringify(coupons),
                {
                    EX: getExpirationTime("orderCoupon"),
                }
            );

            //Updating cache
            await redisClient.set(
                getEphimeralTermKey(business.id, "order", tId),
                JSON.stringify(orderTemplate),
                {
                    EX: getExpirationTime("order"),
                }
            );
        }

        //Setting totals
        const result_totals = await calculateOrderTotal(
            orderTemplate.businessId,
            t
        );

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newOnlineOrder/calculateOrderTotal",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        //Obtain the last operationNumber
        let lastOperationNumber: number = 1;
        if (force_consecutive_invoice_numbers) {
            lastOperationNumber = await OrderReceipt.max("operationNumber", {
                where: {
                    businessId: business.id,
                    createdAt: {
                        [Op.gte]: moment(new Date())
                            .startOf("year")
                            .format("YYYY-MM-DD HH:mm"),
                    },
                },
            });
        } else {
            lastOperationNumber = await OrderReceipt.max("operationNumber", {
                where: {
                    businessId: business.id,
                    origin: "online",
                },
            });
        }

        if (!lastOperationNumber) {
            lastOperationNumber = 1;
        } else {
            lastOperationNumber += 1;
        }

        orderTemplate = await getOrderFromCacheTransaction(business.id, tId);
        orderTemplate.operationNumber = lastOperationNumber;
        orderTemplate.totalToPay = result_totals.data.totalToPay;

        const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
            include: [
                OrderReceiptPrice,
                OrderReceiptTotal,
                { model: Price, as: "tipPrice" },
                { model: Price, as: "couponDiscountPrice" },
                { model: Price, as: "shippingPrice" },
                BillingAddress,
                ShippingAddress,
                {
                    model: SelledProduct,
                    include: [
                        {
                            model: SelledProductAddon,
                            as: "addons",
                            include: [{ model: Price, as: "priceUnitary" }],
                        },
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                    ],
                },
            ],
        });

        await order.save({ transaction: t });

        //Analyzing if coupons must be updated
        if (orderTemplate.coupons && orderTemplate.coupons.length !== 0) {
            await OrderReceiptCoupon.bulkCreate(
                orderTemplate.coupons.map((item: any) => {
                    return {
                        ...item,
                        orderReceiptId: order.id,
                    };
                }),
                {
                    transaction: t,
                }
            );
        }

        await t.commit();

        //Preparing data to return
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope(
            "public_return"
        ).findByPk(order.id);

        res.status(200).json(order_to_emit);

        const listCacheRecords = await getOrderRecordsCache(business.id, tId);
        if (listCacheRecords.length !== 0) {
            orderQueue.add(
                {
                    code: "REGISTER_RECORDS",
                    params: {
                        records: listCacheRecords,
                        orderId: order.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: result.data.affectedProducts,
                    businessId: business.id,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        //send mail
        emailQueue.add(
            {
                code: "NEW_ORDER_NOTIFICATION",
                params: {
                    email: order_to_emit?.client?.email ?? user.email,
                    order_to_emit,
                    business,
                    isOwner: false,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        if (order_to_emit?.shipping.email) {
            emailQueue.add(
                {
                    code: "NEW_ORDER_NOTIFICATION",
                    params: {
                        email: order_to_emit?.shipping.email,
                        order_to_emit,
                        business,
                        isOwner: false,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );

            if (
                order_to_emit?.shipping.email !==
                    order_to_emit?.billing.email &&
                order_to_emit?.billing.email
            ) {
                emailQueue.add(
                    {
                        code: "NEW_ORDER_NOTIFICATION",
                        params: {
                            email: order_to_emit?.billing.email,
                            order_to_emit,
                            business,
                            isOwner: false,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            }
        }

        if (order_notification_users?.value) {
            const userToNotification =
                order_notification_users.value.split(",") || [];

            for (const email of userToNotification) {
                emailQueue.add(
                    {
                        code: "NEW_ODER_NOTIFICATION",
                        params: {
                            email,
                            order_to_emit,
                            business,
                            isOwner: true,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            }
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findMyOrders = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, dateFrom, dateTo, ...params } =
            req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["createdAt", "status", "businessId"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (dateFrom) {
                where_clause["createdAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (dateTo) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["id", "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_orders = await OrderReceipt.findAndCountAll({
            attributes: [
                "id",
                "status",
                "createdAt",
                "operationNumber",
                "deliveryAt",
                "paidAt",
            ],
            distinct: true,
            where: {
                ...where_clause,
                managedById: user.id,
            },
            include: [
                {
                    model: Business,
                    attributes: ["name"],
                },
                {
                    model: SelledProduct,
                    attributes: ["id", "name", "quantity"],
                    separate: true,
                    include: [
                        {
                            model: Variation,
                            attributes: ["name"],
                        },
                        {
                            model: Image,
                            attributes: ["src", "thumbnail", "blurHash"],
                        },
                        {
                            model: Price,
                            as: "priceTotal",
                            attributes: ["amount", "codeCurrency"],
                        },
                        {
                            model: Price,
                            as: "priceUnitary",
                            attributes: ["amount", "codeCurrency"],
                        },
                    ],
                },
                {
                    model: Price,
                    as: "shippingPrice",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Price,
                    as: "taxes",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: OrderReceiptPrice,
                    attributes: ["price", "codeCurrency"],
                },
                {
                    model: OrderReceiptTotal,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: ShippingAddress,
                    attributes: [
                        "street_1",
                        "street_2",
                        "firstName",
                        "lastName",
                        "company",
                        "city",
                        "postalCode",
                        "phone",
                        "email",
                        "description",
                    ],
                    include: [
                        {
                            model: Municipality,
                            attributes: ["name", "code"],
                        },
                        {
                            model: Province,
                            attributes: ["name", "code"],
                        },
                        {
                            model: Country,
                            attributes: ["name", "code"],
                        },
                    ],
                },
                {
                    model: PaymentGateway,
                    attributes: ["id", "name", "code"],
                },
            ],
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_orders.count / limit);
        if (found_orders.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_orders.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: found_orders.rows,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const cancelMyOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

     //@ts-ignore
     const tId = t.id;
     
    try {
        const { id } = req.params;
        const user: User = req.user;
        const business: Business = req.business;

        //Validations
        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const order = await OrderReceipt.findOne({
            where: {
                id,
            },
            include: [
                CurrencyPayment,
                CashRegisterOperation,
                {
                    model: SelledProduct,
                    include: [SelledProductAddon],
                },
            ],
            transaction: t,
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `Order not found or not available`,
            });
        }

        if (order.managedById !== user.id) {
            t.rollback();
            return res.status(404).json({
                message: `Parece que esta orden no fue creada con su usuario. Acción no permitida.`,
            });
        }

        //Configurations
        const configurations = await getBusinessConfigCache(business.id);

        const online_shop_area_stock = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;

        //Finding client
        const client = await Client.findOne({
            where: {
                businessId: business.id,
                userId: user.id,
            },
        });

        if (!client) {
            return res.status(404).json({
                message: `Su usuario no tiene asociado ningún cliente.`,
            });
        }

        if (order.clientId !== client.id) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene permisos para cancelar esta orden.`,
            });
        }

        //Check order origin
        if (
            ![
                "woo",
                "online",
                "shop",
                "shopapk",
                "marketplace",
                "apk",
            ].includes(order.origin)
        ) {
            t.rollback();
            return res.status(401).json({
                message: `El origen de la orden no es válido.`,
            });
        }

        if (!["CREATED", "PAYMENT_PENDING"].includes(order.status)) {
            t.rollback();
            return res.status(400).json({
                message: `Su orden no puede ser cancelada. Contacte al negocio para más información.`,
            });
        }

        let listRecords: any = [];
        listRecords.push({
            action: "ORDER_CANCELLED",
            title: getTitleOrderRecord("ORDER_CANCELLED"),
            details: `Cancelada por el usuario`,
            orderReceiptId: order.id,
            isPublic: true,
            madeById: user.id,
        });

        //General variables
        order.status = "CANCELLED";
        //Unregistering payment date
        //@ts-ignore
        order.paidAt = null;

        if (!order.isPreReceipt) {
            let normalizeProducts: Array<ItemProductSelled> = [];
            for (const element of order.selledProducts) {
                const foundSelled = order.selledProducts.find(
                    item => item.id === element.id
                );
    
                if (!foundSelled) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto vendido con id ${element.id} no fue encontrado en la orden.`,
                    });
                }
    
                let bulkAddon = [];
                for (const addon of element.addons || []) {
                    const found = foundSelled.addons?.find(
                        item => item.id === addon.id
                    );
    
                    if (found) {
                        bulkAddon.push({
                            id: found.id,
                            quantity: addon.quantity,
                        });
                    }
                }
    
                //If was deleted selledProduct completly, remove all its addons
                if (foundSelled.quantity === element.quantity) {
                    bulkAddon = [];
                    for (const addon of foundSelled.addons || []) {
                        bulkAddon.push({
                            id: addon.id,
                            quantity: addon.quantity,
                        });
                    }
                }
    
                normalizeProducts.push({
                    productId: foundSelled.productId,
                    quantity: element.quantity,
                    productionAreaId: foundSelled.productionAreaId,
                    variationId: foundSelled.variationId,
                    addons: bulkAddon,
                });
            }
    
            const result = await restoreProductStockDisponibility(
                {
                    products: normalizeProducts,
                    stockAreaId: Number(online_shop_area_stock),
                    businessId: business.id,
                    userId: user.id,
                    isAtSameEconomicCycle:
                        order.createdInActualCycle === undefined ||
                        order.createdInActualCycle,
                },
                t
            );
    
            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                    origin: "cancelMyOrder/restoreProductStockDisponibility",
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: business.id,
                    userId: user.id,
                });
                return res.status(result.status).json({
                    message: result.message,
                });
            }
        }

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(order),
            {
                EX: getExpirationTime("order"),
            }
        );


        const cancelResult =  await afterOrderCancelled(
            {
                businessId: order.businessId,
            },
            t
        );

        if (!internalCheckerResponse(cancelResult)) {
            t.rollback();
            Logger.error(cancelResult.message || "Ha ocurrido un error inesperado.", {
                origin: "marketplace/cancelMyOrder/afterOrderCancelled",
                businessId: user.businessId,
                userId: user.id,
            });
            return res.status(cancelResult.status).json({
                message: cancelResult.message,
            });
        }

        await order.save({ transaction: t });

        //Procesing data to emit
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
            order.id,
            {
                transaction: t,
            }
        );

        await t.commit();
        res.status(200).json(order_to_emit);

        orderQueue.add(
            {
                code: "REGISTER_RECORDS",
                params: {
                    records: listRecords,
                    orderId: order.id,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: order.selledProducts.map(
                        item => item.productId
                    ),
                    businessId: business.id,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user: User = req.user;
        const business: Business = req.business;

        //Validations
        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const allowedStatus = ["COMPLETED", "DELIVERED", "IN_TRANSIT"];

        if (!allowedStatus.includes(status)) {
            t.rollback();
            return res.status(400).json({
                message: `${status} is not an allowed type. Fields allowed: ${allowedStatus}`,
            });
        }

        const order = await OrderReceipt.findOne({
            where: {
                id,
                businessId: business.id,
            },
            include: [PaymentGateway],
            transaction: t,
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `Order not found or not available`,
            });
        }

        //Check order origin
        if (
            ![
                "woo",
                "online",
                "shop",
                "shopapk",
                "marketplace",
                "apk",
            ].includes(order.origin)
        ) {
            t.rollback();
            return res.status(401).json({
                message: `El origen de la orden no es válido.`,
            });
        }

        if (["CANCELLED", "REFUNDED", "DELIVERED"].includes(order.status)) {
            t.rollback();
            return res.status(400).json({
                message: `La orden ha sido cerrada y no puede ser modificada.`,
            });
        }

        order.status = status;

        let listRecords: any = [];

        listRecords.push({
            action: "ORDER_EDITED",
            title: getTitleOrderRecord("ORDER_EDITED"),
            details: `Estado: ${getOrderStatus(status)}`,
            orderReceiptId: order.id,
            isPublic: false,
            madeById: user.id,
        });

        await OrderReceiptRecord.bulkCreate(listRecords, { transaction: t });

        await order.save({ transaction: t });

        //Procesing data to emit
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope(
            "public_return"
        ).findByPk(order.id, {
            transaction: t,
        });

        await t.commit();
        res.status(200).json(order_to_emit);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const payOnlineOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    //@ts-ignore
    const tId = t.id;

    try {
        const { id } = req.params;
        const { data, amount, codeCurrency } = req.body;
        const business: Business = req.business;

        const order = await OrderReceipt.findOne({
            where: {
                id,
                businessId: business.id,
            },
            include: [
                PaymentGateway,
                SelledProduct,
                OrderReceiptPrice,
                {
                    model: Coupon,
                    through: {
                        attributes: [],
                    },
                },
                { model: Price, as: "tipPrice" },
                { model: Price, as: "amountReturned" },
                { model: Price, as: "couponDiscountPrice" },
            ],
            transaction: t,
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `Order not found or not available`,
            });
        }

        const currenciesPayment = [
            {
                amount: Number(amount),
                codeCurrency,
                paymentWay: "TROPIPAY" as payments_ways,
            },
        ];

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(order),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Pay order
        const result_pay = await payOrderProcessator(
            {
                businessId: order.businessId,
                origin: "online",
                onlineData: {
                    currenciesPayment,
                },
            },
            t
        );

        if (!internalCheckerResponse(result_pay)) {
            t.rollback();
            Logger.error(
                result_pay.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "payOnlineOrder/payOrderProcessator",
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: business.id,
                }
            );
            return res.status(result_pay.status).json({
                message: result_pay.message,
            });
        }

        let listRecords: any = [];

        listRecords.push({
            action: "ORDER_EDITED",
            title: getTitleOrderRecord("ORDER_EDITED"),
            details: `Transacción registrada desde pasarela de pago externa. ${data.toString()}`,
            orderReceiptId: order.id,
            isPublic: false,
        });

        let orderTemplate = await getOrderFromCacheTransaction(
            business.id,
            tId
        );

        if (!orderTemplate) {
            t.rollback();
            return res.status(404).json({
                message: `Order not found or not available`,
            });
        }

        //Update order
        const updatedOrder = await OrderReceipt.findByPk(orderTemplate.id, {
            transaction: t,
        });
        if (updatedOrder) {
            updatedOrder.status = "BILLED";
            await updatedOrder.save({ transaction: t });
        }

        //Procesing data to emit
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope(
            "public_return"
        ).findByPk(orderTemplate.id, {
            transaction: t,
        });

        await t.commit();
        res.status(200).json(order_to_emit);

        const listCacheRecords = await getOrderRecordsCache(
            orderTemplate.businessId,
            tId
        );
        if (listCacheRecords.length !== 0) {
            orderQueue.add(
                {
                    code: "REGISTER_RECORDS",
                    params: {
                        records: listCacheRecords,
                        orderId: order.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        // send email notification
        if (order_to_emit && order_to_emit.client?.email) {
            emailQueue.add(
                {
                    code: "NEW_ORDER_NOTIFICATION",
                    params: {
                        email: order_to_emit.client?.email,
                        order_to_emit,
                        business,
                        isOwner: false,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getOrder = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const order = await OrderReceipt.findByPk(id);

        if (!order) {
            return res.status(404).json({
                message: `Order not found`,
            });
        }

        //Permission Check
        if (order?.managedById !== user.id) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const to_return = await OrderReceipt.scope("public_return").findByPk(
            id
        );

        res.status(200).json(to_return);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
