import { Response } from "express";
import { Op, where, fn, col, Transaction } from "sequelize";
import axios, { AxiosResponse } from "axios";

import { pag_params } from "../../database/pag_params";
import db from "../../database/connection";
import { config_transactions } from "../../database/seq-transactions";
import Business from "../../database/models/business";
import {
    LineItem,
    WooCustomer,
    WooOrder,
    WooPaymentGateway,
} from "../../interfaces/wocoommerce";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import OrderReceipt from "../../database/models/orderReceipt";
import { getTitleOrderRecord } from "../../helpers/translator";
import Product from "../../database/models/product";
import ProductPrice from "../../database/models/productPrice";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Price from "../../database/models/price";
import ConfigurationKey from "../../database/models/configurationKey";
import {
    checkerResponse,
    clearHTMLToString,
    internalCheckerResponse,
    mathOperation,
    obtainingProductPriceSystemPriceDefined,
    orderStatusTransformer,
} from "../../helpers/utils";
import SelledProduct from "../../database/models/selledProduct";
import OrderReceiptRecord from "../../database/models/orderReceiptRecord";
import { _getOAuth } from "../../bull-queue/wocommerce";
import { order_receipt_status } from "../../interfaces/nomenclators";
import BillingAddress from "../../database/models/billingAddress";
import ShippingAddress from "../../database/models/shippingAddress";
import Municipality from "../../database/models/municipality";
import Province from "../../database/models/province";
import Country from "../../database/models/country";
import Client from "../../database/models/client";
import Address from "../../database/models/address";
import User from "../../database/models/user";
import PaymentGateway from "../../database/models/paymentGateway";
import Logger from "../../lib/logger";
import CurrencyPayment from "../../database/models/currencyPayment";
import {
    payOrderProcessator,
    registerSelledProductInOrder,
} from "../helpers/products";
import { InternalHelperResponse } from "../helpers/interfaces";
import { ItemProductSelled } from "../../interfaces/models";
import Combo from "../../database/models/Combo";
import { productQueue } from "../../bull-queue/product";
import moment from "moment";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
    getEphimeralTermKey,
    getExpirationTime,
} from "../../helpers/redisStructure";
import { redisClient } from "../../../app";

//TODO: Variations are not yet supported
const syncroOrder = async (
    order: OrderReceipt,
    wooOrder: WooOrder,
    childt: Transaction,
    userId?: number
): Promise<InternalHelperResponse> => {
    //@ts-ignore
    const tId = childt.id;

    //Generals
    let orderStatus = "";
    let observations = "";

    //Configurations
    const configurations = await getBusinessConfigCache(order.businessId);

    const online_shop_main_currency = configurations.find(
        item => item.key === "online_shop_main_currency"
    )?.value;

    //Taking first by default Woo
    const online_shop_price_system = configurations
        .find(item => item.key === "online_shop_price_system")
        ?.value.split(",")[0];
    const online_shop_area_stock = configurations
        .find(item => item.key === "online_shop_area_stock")
        ?.value.split(",")[0];

    //Dividing products according type
    let externalIds = wooOrder.line_items.map(
        (item: LineItem) => item.product_id
    );

    // let externalVariationsIds = wooOrder.line_items
    //     .filter(item => !!item.variation_id)
    //     .map((item: LineItem) => item.variation_id);

    //--> INIT Validations
    const availableCurrencies = await getCurrenciesCache(order.businessId);

    const shopCurrency = availableCurrencies.find(
        item => item.currency.code === wooOrder.currency
    );

    if (!shopCurrency) {
        observations += `La moneda de la orden no fue encontrada en el negocio.\n`;
        orderStatus = "WITH_ERRORS";
    }

    const checker_products = await Product.findAll({
        where: { externalId: externalIds },
        include: [ProductPrice, Price],
    });

    //Analyzing each product
    for (const externalId of externalIds) {
        if (!checker_products.find(item => item.externalId === externalId)) {
            observations += `El producto con id externo ${externalId} no fue encontrada en el negocio.\n`;
            orderStatus = "WITH_ERRORS";
        }
    }

    //Checking prices
    for (const product of checker_products) {
        const itemPrice = obtainingProductPriceSystemPriceDefined(
            product,
            undefined,
            Number(online_shop_price_system),
            online_shop_main_currency
        );
        if (!itemPrice) {
            observations += `El precio del producto ${product.name} no fue encontrado.\n`;
            orderStatus = "WITH_ERRORS";
        }

        if (product.totalQuantity <= 0 && product.stockLimit) {
            observations += `${product.name} no esta disponible para la venta.\n`;
            orderStatus = "WITH_ERRORS";
        }

        const quantity =
            wooOrder.line_items.find(
                item => item.product_id === product.externalId
            )?.quantity || 0;

        if (quantity > product.totalQuantity && product.stockLimit) {
            observations += `La cantidad seleccionada de ${product.name} no está disponible para la venta. Cantidad disponible: ${product.totalQuantity}.\n`;
            orderStatus = "WITH_ERRORS";
        }
    }

    const stockIds = checker_products
        .filter(item => ["STOCK"].includes(item.type))
        .map(item => item.id);

    const productsInStock = await StockAreaProduct.findAll({
        where: {
            productId: stockIds,
            areaId: Number(online_shop_area_stock),
        },
        include: [Product],
    });

    for (const productId of stockIds) {
        const found = productsInStock.find(
            item => item.productId === productId
        );

        if (!found) {
            observations += `El producto con id ${productId} no está disponible para la venta.\n`;
            orderStatus = "WITH_ERRORS";
            continue;
        }

        const quantity =
            wooOrder.line_items.find(
                item => item.product_id === found.product.externalId
            )?.quantity || 0;

        if (found.quantity < quantity) {
            observations += `La cantidad seleccionada de ${productId} no está disponible para la venta. Cantidad disponible: ${found.quantity}`;
            orderStatus = "WITH_ERRORS";
            continue;
        }
    }

    // const variationStockIds = checker_products
    //     .filter(item => ["VARIATION"].includes(item.type))
    //     .map(item => item.id);

    // const productsVariationInStock = await StockAreaVariation.findAll({
    //     where: {
    //         externalId: externalVariationsIds,
    //     },
    //     include: [
    //         Variation,
    //         {
    //             model: StockAreaProduct,
    //             where: {
    //                 areaId: Number(online_shop_area_stock),
    //             },
    //         },
    //     ],
    // });

    // for (const productId of variationStockIds) {
    //     const found = productsVariationInStock.find(
    //         item => item.stockAreaProduct.productId === productId
    //     );

    //     if (!found) {
    //         observations += `El producto variable con id ${productId} no está disponible para la venta.\n`;
    //         orderStatus = "WITH_ERRORS";
    //         continue;
    //     }

    //     const quantity =
    //         wooOrder.line_items.find(
    //             item => item.variation_id === found.variation.externalId
    //         )?.quantity || 0;

    //     if (found.quantity < quantity) {
    //         observations += `La cantidad seleccionada de ${productId} no está disponible para la venta. Cantidad disponible: ${found.quantity}`;
    //         orderStatus = "WITH_ERRORS";
    //         continue;
    //     }
    // }

    //Analyzing case special COMBOS
    const combosIds = checker_products
        .filter(item => ["COMBO"].includes(item.type))
        .map(item => item.id);

    if (combosIds.length !== 0) {
        const productsCombos = await Combo.findAll({
            where: {
                comboBaseProductId: combosIds,
            },
            include: [
                {
                    model: Product,
                    as: "composed",
                },
            ],
        });

        //Getting stock products
        let stockCombosProducts: Array<{
            productId: number;
            quantity: number;
            baseProductId: number;
            nameProduct: string;
        }> = [];
        productsCombos.forEach(item => {
            if (item.composed.type === "STOCK") {
                stockCombosProducts.push({
                    nameProduct: item.composed.name,
                    productId: item.composedId,
                    quantity: item.quantity,
                    baseProductId: item.comboBaseProductId,
                });
            }
        });

        const comboProductsInStock = await StockAreaProduct.findAll({
            where: {
                productId: stockCombosProducts.map(item => item.productId),
                areaId: Number(online_shop_area_stock),
            },
            include: [Product],
        });

        for (const product of stockCombosProducts) {
            const found = comboProductsInStock.find(
                item => item.productId === product.productId
            );
            const foundBase = checker_products.find(
                item => item.id === product.baseProductId
            );

            if (!found) {
                observations += `El producto ${product.nameProduct} en ${foundBase?.name} no está disponible para la venta en el almacén de la tienda.\n`;
                orderStatus = "WITH_ERRORS";
                continue;
            }

            if (found.quantity < product.quantity) {
                observations += `La cantidad seleccionada de ${product.nameProduct} en ${foundBase?.name} no está disponible para la venta en el almacén de la tienda. Cantidad disponible: ${product.quantity}`;
                orderStatus = "WITH_ERRORS";
                continue;
            }
        }
    }
    //--> END Validations

    const [municipalities, provinces, countries] = await Promise.all([
        Municipality.findAll(),
        Province.findAll(),
        Country.findAll(),
    ]);

    //Billing Address
    const billing = {
        firstName: wooOrder.billing.first_name,
        lastName: wooOrder.billing.last_name,
        company: wooOrder.billing.company,
        street_1: wooOrder.billing.address_1,
        street_2: wooOrder.billing.address_2,
        city: wooOrder.billing.city,
        provinceId: provinces.find(
            item => item.code === wooOrder.billing.state?.toLowerCase()
        )?.id,
        postalCode: wooOrder.billing.postcode,
        countryId: countries.find(
            item => item.code === wooOrder.billing.country
        )?.id,
        email: wooOrder.billing.email,
        phone: wooOrder.billing.phone,
    };

    //Shipping Address
    const shipping = {
        firstName: wooOrder.shipping.first_name,
        lastName: wooOrder.shipping.last_name,
        company: wooOrder.shipping.company,
        street_1: wooOrder.shipping.address_1,
        street_2: wooOrder.shipping.address_2,
        city: wooOrder.shipping.city,
        provinceId: provinces.find(
            item => item.code === wooOrder.shipping.state?.toLowerCase()
        )?.id,
        postalCode: wooOrder.shipping.postcode,
        countryId: countries.find(
            item => item.code === wooOrder.shipping.country
        )?.id,
        phone: wooOrder.shipping.phone,
    };

    //Customer
    const client = await Client.findOne({
        where: {
            businessId: order.businessId,
            externalId: wooOrder.customer_id,
        },
    });

    //Updating fiels
    order.customerNote = wooOrder.customer_note;
    order.status = orderStatus as order_receipt_status;
    order.clientId = client?.id;

    if (order.shipping) {
        await ShippingAddress.update(shipping, {
            where: {
                id: order.shipping.id,
            },
            transaction: childt,
        });
    } else {
        const element = ShippingAddress.build({
            ...shipping,
            orderReceiptId: order.id,
        });

        await element.save({ transaction: childt });
    }

    if (order.billing) {
        await BillingAddress.update(billing, {
            where: {
                id: order.billing.id,
            },
            transaction: childt,
        });
    } else {
        const element = BillingAddress.build({
            ...billing,
            orderReceiptId: order.id,
        });

        await element.save({ transaction: childt });
    }

    await order.save({ transaction: childt });

    let listRecords: any = [];

    //If any Error is detected order must be save
    if (orderStatus === "WITH_ERRORS") {
        const products = wooOrder.line_items
            .map(item => `x(${item.quantity}) ${item.name}`)
            .join(";");

        listRecords.push({
            action: "WITH_ERRORS",
            title: getTitleOrderRecord("WITH_ERRORS"),
            details: observations + " Pedido:" + products,
            orderReceiptId: order.id,
            userId,
            isPublic: true,
        });

        //Create Records
        await OrderReceiptRecord.bulkCreate(listRecords, {
            transaction: childt,
        });

        return {
            status: 200,
        };
    }

    //Registering actions
    listRecords.push({
        action: "ORDER_SYNCRONIZED",
        title: getTitleOrderRecord("ORDER_SYNCRONIZED"),
        details: observations,
        orderReceiptId: order.id,
        userId,
        isPublic: true,
    });

    if (wooOrder.shipping_total) {
        const price = Number(wooOrder.shipping_total);

        if (order.shippingPrice) {
            if (order.shippingPrice.amount !== price) {
                order.shippingPrice.amount = price;
                await order.shippingPrice.save({ transaction: childt });
            }
        } else {
            const new_price = Price.build({
                amount: price,
                codeCurrency: online_shop_main_currency,
            });

            await new_price.save({ transaction: childt });

            order.shippingPriceId = new_price.id;
        }
    }

    //Products
    if (
        (!order.selledProducts ||
            (order.selledProducts && order.selledProducts.length === 0)) &&
        externalIds.length !== 0
    ) {
        //1. Normalize products to Sell and register
        const productsToSell: Array<ItemProductSelled> = [];
        externalIds.forEach((element: number) => {
            const found = checker_products.find(
                item => item.externalId === element
            );

            if (found) {
                const wooProduct = wooOrder.line_items.find(
                    item => item.product_id === found.externalId
                )!;

                let variationId;
                //TODO:
                if (found.type === "VARIATION") {
                }

                productsToSell.push({
                    productId: found.id,
                    quantity: wooProduct.quantity,
                    variationId,
                    addons: [],
                });
            }
        });

        await redisClient.set(
            getEphimeralTermKey(order.businessId, "order", tId),
            JSON.stringify(order),
            {
                EX: getExpirationTime("order"),
            }
        );

        const result = await registerSelledProductInOrder(
            {
                productsToSell,
                stockAreaId: Number(online_shop_area_stock),
                businessId: order.businessId,
                origin: "online",
            },
            childt
        );

        if (!internalCheckerResponse(result)) {
            return result;
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: productsToSell.map(item => item.productId),
                    businessId: order.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
    }

    if (wooOrder.date_paid && !order.paidAt) {
        //Finding way of payment
        const paymentsGateways = await PaymentGateway.findAll({
            where: {
                businessId: order.businessId,
            },
        });

        const found = paymentsGateways.find(
            item => item.externalId === wooOrder.payment_method
        );
        if (found) {
            order.paymentGatewayId = found.id;
            await order.save({ transaction: childt });
        }

        //2. Pay order
        const result_pay = await payOrderProcessator(
            {
                businessId: order.businessId,
                origin: "online",
                onlineData: {
                    paidAt: moment(wooOrder.date_paid).format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                },
            },
            childt
        );

        if (!internalCheckerResponse(result_pay)) {
            return result_pay;
        }
    }

    //Create Records
    if (listRecords.length !== 0) {
        await OrderReceiptRecord.bulkCreate(listRecords, {
            transaction: childt,
        });
    }

    order.status = orderStatusTransformer(wooOrder.status);
    await order.save({ transaction: childt });

    return {
        status: 200,
    };
};

export const newWooOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const business: Business = req.business;
        const { id } = req.params;
        const { originalOrder } = req.body;

        let wooOrder: WooOrder;

        if (!originalOrder) {
            //Making request
            const authorization = await _getOAuth(business.id);
            const url = `${authorization.url}/orders/${id}`;

            const response: any = await axios
                .get(url, {
                    params: authorization.oAuth.authorize({
                        url,
                        method: "GET",
                    }),
                })
                .catch(error => {
                    Logger.error(error.data, { url, businessId: business.id });
                    t.rollback();
                    return res.status(error.response?.status || 500).json({
                        message:
                            error.response?.statusText ||
                            "Ha ocurrido un error interno. Por favor consulte al administrador.",
                    });
                });

            if (!checkerResponse(response)) {
                return;
            }

            wooOrder = response.data;
        } else {
            wooOrder = originalOrder;
        }

        //Checking if order was already created
        const orderCreated = await OrderReceipt.findOne({
            where: {
                externalId: wooOrder.id,
                businessId: business.id,
            },
        });

        if (orderCreated) {
            t.rollback();
            return res.status(400).json({
                message:
                    "La orden ya fue registrada en TECOPOS. Intente actualizando.",
            });
        }

        const order: OrderReceipt = OrderReceipt.build(
            {
                isForTakeAway: true,
                operationNumber: wooOrder.number,
                businessId: business.id,
                origin: "woo",
                externalId: wooOrder.id,
                status: "CREATED",
            },
            {
                include: [BillingAddress, ShippingAddress, SelledProduct],
            }
        );

        await order.save({ transaction: t });

        //Blocking order
        await OrderReceipt.findByPk(order.id, {
            lock: true,
            transaction: t,
        });
        //End of blocking order

        const record = OrderReceiptRecord.build({
            action: "ORDER_CREATED",
            title: getTitleOrderRecord("ORDER_CREATED"),
            orderReceiptId: order.id,
            isPublic: true,
        });

        await record.save({ transaction: t });

        const result = await syncroOrder(order, wooOrder, t);

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                origin: "newWooOrder/syncroOrder",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        await t.commit();

        res.status(201).json({
            message: `Operation completed`,
        });
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        console.log(error);
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const syncroniceWooOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { id } = req.params;

        //Making request
        const authorization = await _getOAuth(user.businessId);
        const url = `${authorization.url}/orders/${id}`;

        const response: any = await axios
            .get(url, {
                params: authorization.oAuth.authorize({
                    url,
                    method: "GET",
                }),
            })
            .catch(error => {
                console.log({ url, error: error.toString() });
                Logger.error(error.data, {
                    url,
                    businessId: user.businessId,
                    userId: user.id,
                });
                t.rollback();
                return res.status(error.response?.status || 500).json({
                    message:
                        error.response?.statusText ||
                        "Ha ocurrido un error interno. Por favor consulte al administrador.",
                });
            });

        if (checkerResponse(response)) {
            const wooOrder: WooOrder = response.data;

            //Checking if order was already created
            const orderCreated = await OrderReceipt.findOne({
                where: {
                    externalId: wooOrder.id,
                    businessId: user.businessId,
                },
                include: [SelledProduct, ShippingAddress, BillingAddress],
            });

            if (!orderCreated) {
                t.rollback();
                return res.status(400).json({
                    message:
                        "La orden no fue encontrada. Contacte al administrador",
                });
            }

            const result = await syncroOrder(
                orderCreated,
                wooOrder,
                t,
                user.id
            );

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.error(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "syncroniceWooOrder/syncroOrder",
                        "X-App-Origin": req.header("X-App-Origin"),
                        businessId: user.businessId,
                        userId: user.id,
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }

            await t.commit();

            const to_return = await OrderReceipt.scope("full_details").findByPk(
                orderCreated.id
            );
            res.status(200).json(to_return);
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        console.log(error);
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editWooOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const business: Business = req.business;
        const { id } = req.params;
        const { originalOrder } = req.body;

        let wooOrder: WooOrder;

        if (!originalOrder) {
            //Making request
            const authorization = await _getOAuth(business.id);
            const url = `${authorization.url}/orders/${id}`;

            const response: any = await axios
                .get(url, {
                    params: authorization.oAuth.authorize({
                        url,
                        method: "GET",
                    }),
                })
                .catch(error => {
                    console.log({ url, error: error.toString() });
                    Logger.error(error.data, { url, businessId: business.id });
                    t.rollback();
                    return res.status(error.response?.status || 500).json({
                        message:
                            error.response?.statusText ||
                            "Ha ocurrido un error interno. Por favor consulte al administrador.",
                    });
                });

            if (!checkerResponse(response)) {
                return;
            }

            wooOrder = response.data;
        } else {
            wooOrder = originalOrder;
        }

        const order = await OrderReceipt.findOne({
            where: {
                externalId: wooOrder.id,
            },
            include: [BillingAddress, ShippingAddress, SelledProduct],
            transaction: t,
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: "La orden no fue encontrada en el sistema.",
            });
        }

        //Blocking order
        await OrderReceipt.findByPk(order.id, {
            lock: true,
            transaction: t,
        });
        //End of blocking order

        let listRecords: any = [];

        if (order.status === "WITH_ERRORS") {
            listRecords.push({
                action: "WITH_ERRORS",
                title: getTitleOrderRecord("WITH_ERRORS"),
                details: `En Woocommerce cambió de estado a: ${wooOrder.status}`,
                orderReceiptId: order.id,
                isPublic: false,
            });

            return res.status(200).json({
                message: `Operation completed`,
            });
        }

        //Where to syncronize
        if (["processing", "on-hold"].includes(wooOrder.status)) {
            const result = await syncroOrder(order, wooOrder, t);

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.error(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "editWooOrder/syncroOrder",
                        "X-App-Origin": req.header("X-App-Origin"),
                        businessId: business.id,
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }
        }

        if (wooOrder.status === "cancelled") {
            listRecords.push({
                action: "ORDER_CANCELLED",
                title: getTitleOrderRecord("ORDER_CANCELLED"),
                details: `Cancelada por el usuario`,
                orderReceiptId: order.id,
                isPublic: false,
            });

            //CANCELLED
            order.status = "CANCELLED";
        } else if (wooOrder.status === "processing") {
            listRecords.push({
                action: "ORDER_BILLED",
                title: getTitleOrderRecord("ORDER_BILLED"),
                orderReceiptId: order.id,
                isPublic: false,
            });

            //BILLED
            order.status = "BILLED";
        } else if (wooOrder.status === "on-hold") {
            listRecords.push({
                action: "WAITING",
                title: `${getTitleOrderRecord("WAITING")} - Pendiente de pago`,
                orderReceiptId: order.id,
                isPublic: false,
            });

            //PAYMENT_PENDING
            order.status = "PAYMENT_PENDING";
        } else {
            //Other states
            order.status = orderStatusTransformer(wooOrder.status);

            listRecords.push({
                action: order.status,
                title: "Cambio de estado Woo",
                orderReceiptId: order.id,
                isPublic: false,
            });
        }

        await OrderReceiptRecord.bulkCreate(listRecords, { transaction: t });

        await order.save({ transaction: t });
        await t.commit();

        res.status(200).json({
            message: `Operation completed`,
        });
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

export const newWooClient = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const business: Business = req.business;
        const { id } = req.params;
        const { originalClient } = req.body;

        let wooCustomer: WooCustomer;

        if (!originalClient) {
            //Making request
            const authorization = await _getOAuth(business.id);
            const url = `${authorization.url}/customers/${id}`;

            const response: any = await axios
                .get(url, {
                    params: authorization.oAuth.authorize({
                        url,
                        method: "GET",
                    }),
                })
                .catch(error => {
                    console.log({ url, error: error.toString() });
                    Logger.error(error.data, { url, businessId: business.id });
                    t.rollback();
                    return res.status(error.response?.status || 500).json({
                        message:
                            error.response?.statusText ||
                            "Ha ocurrido un error interno. Por favor consulte al administrador.",
                    });
                });

            if (!checkerResponse(response)) {
                return;
            }

            wooCustomer = response.data;
        } else {
            wooCustomer = originalClient;
        }

        const [municipalities, provinces, countries] = await Promise.all([
            Municipality.findAll(),
            Province.findAll(),
            Country.findAll(),
        ]);

        //Address
        const address = {
            street_1: wooCustomer.billing.address_1,
            street_2: wooCustomer.billing.address_2,
            city: municipalities.find(
                item => item.code === wooCustomer.billing.city
            )?.id,
            state: provinces.find(
                item => item.code === wooCustomer.billing.state
            )?.id,
            postalCode: wooCustomer.billing.postcode,
            country: countries.find(
                item => item.code === wooCustomer.billing.country
            )?.id,
        };

        const client: Client = Client.build(
            {
                businessId: business.id,
                externalId: wooCustomer.id,
                firstName: wooCustomer.first_name,
                lastName: wooCustomer.last_name,
                email: wooCustomer.email,
                address,
                registrationWay: "woo",
            },
            { include: [Address] }
        );

        await client.save({ transaction: t });
        await t.commit();

        res.status(201).json({
            message: `Operation completed`,
        });
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

export const editWooClient = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const business: Business = req.business;
        const { id } = req.params;
        const { originalClient } = req.body;

        let wooCustomer: WooCustomer;

        if (!originalClient) {
            //Making request
            const authorization = await _getOAuth(business.id);
            const url = `${authorization.url}/customers/${id}`;

            const response: any = await axios
                .get(url, {
                    params: authorization.oAuth.authorize({
                        url,
                        method: "GET",
                    }),
                })
                .catch(error => {
                    console.log({ url, error: error.toString() });
                    Logger.error(error.data, { url, businessId: business.id });
                    t.rollback();
                    return res.status(error.response?.status || 500).json({
                        message:
                            error.response?.statusText ||
                            "Ha ocurrido un error interno. Por favor consulte al administrador.",
                    });
                });

            if (!checkerResponse(response)) {
                return;
            }

            wooCustomer = response.data;
        } else {
            wooCustomer = originalClient;
        }

        const [municipalities, provinces, countries] = await Promise.all([
            Municipality.findAll(),
            Province.findAll(),
            Country.findAll(),
        ]);

        const foundExistence = await Client.findOne({
            where: {
                externalId: wooCustomer.id,
                businessId: business.id,
            },
        });

        if (foundExistence) {
            //Updating fields
            foundExistence.firstName = wooCustomer.first_name;
            foundExistence.lastName = wooCustomer.last_name;
            foundExistence.email = wooCustomer.email;

            const newAddress = Address.build({
                street_1: wooCustomer.billing.address_1,
                street_2: wooCustomer.billing.address_2,
                city: municipalities.find(
                    item => item.code === wooCustomer.billing.city
                )?.id,
                state: provinces.find(
                    item => item.code === wooCustomer.billing.state
                )?.id,
                postalCode: wooCustomer.billing.postcode,
                country: countries.find(
                    item => item.code === wooCustomer.billing.country
                )?.id,
            });

            await newAddress.save({ transaction: t });

            await Address.destroy({
                where: {
                    id: foundExistence.addressId,
                },
                transaction: t,
            });

            foundExistence.addressId = newAddress.id;

            await foundExistence.save({ transaction: t });
            await t.commit();

            const to_return = await Client.scope("to_return").findByPk(
                foundExistence.id
            );
            return res.status(200).json(to_return);
        }

        //Address
        const address = {
            street_1: wooCustomer.billing.address_1,
            street_2: wooCustomer.billing.address_2,
            city: municipalities.find(
                item => item.code === wooCustomer.billing.city
            )?.id,
            state: provinces.find(
                item => item.code === wooCustomer.billing.state
            )?.id,
            postalCode: wooCustomer.billing.postcode,
            country: countries.find(
                item => item.code === wooCustomer.billing.country
            )?.id,
        };

        const client: Client = Client.build(
            {
                businessId: business.id,
                externalId: wooCustomer.id,
                firstName: wooCustomer.first_name,
                lastName: wooCustomer.last_name,
                email: wooCustomer.email,
                address,
                registrationWay: "woo",
            },
            { include: [Address] }
        );

        await client.save({ transaction: t });
        await t.commit();

        return res.status(200).json({
            message: `Operation completed`,
        });
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

export const syncPaymentGateways = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;

        //Making request
        const authorization = await _getOAuth(user.businessId);
        const url = `${authorization.url}/payment_gateways`;

        const response: any = await axios
            .get(url, {
                params: authorization.oAuth.authorize({
                    url,
                    method: "GET",
                }),
            })
            .catch(error => {
                console.log({ url, error: error.toString() });
                Logger.error(error.data, {
                    url,
                    businessId: user.businessId,
                    userId: user.id,
                });
                t.rollback();
                return res.status(error.response?.status || 500).json({
                    message:
                        error.response?.statusText ||
                        "Ha ocurrido un error interno. Por favor consulte al administrador.",
                });
            });

        if (checkerResponse(response)) {
            const listPaymentGateways: Array<WooPaymentGateway> = response.data;

            const businessPaymentGateways = await PaymentGateway.findAll({
                where: {
                    businessId: user.businessId,
                },
            });

            let bulkNew: Array<any> = [];
            let bulkUpdate: Array<any> = [];

            //Analyzing new paymentGateways
            listPaymentGateways.forEach(item => {
                const found = businessPaymentGateways.find(
                    element => element.externalId === item.id
                );

                if (found) {
                    bulkUpdate.push({
                        name: clearHTMLToString(item.title),
                        description: clearHTMLToString(item.description),
                        isActive: item.enabled,
                    });
                    return;
                }

                bulkNew.push({
                    externalId: item.id,
                    name: clearHTMLToString(item.title),
                    description: clearHTMLToString(item.description),
                    isActive: item.enabled,
                    businessId: user.businessId,
                });
            });

            //Updating in DB
            if (bulkNew.length !== 0) {
                await PaymentGateway.bulkCreate(bulkNew, {
                    transaction: t,
                });
            }

            if (bulkUpdate.length !== 0) {
                await PaymentGateway.bulkCreate(bulkUpdate, {
                    updateOnDuplicate: ["name", "description", "isActive"],
                    transaction: t,
                });
            }

            await t.commit();

            const to_return = await PaymentGateway.scope("to_return").findAll({
                where: {
                    businessId: user.businessId,
                },
            });

            return res.status(200).json(to_return);
        }
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const migrateCountriesWoo = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const business: Business = req.business;

        //Making request
        const authorization = await _getOAuth(business.id);
        const url = `${authorization.url}/data/countries`;

        const response: any = await axios
            .get(url, {
                params: authorization.oAuth.authorize({
                    url,
                    method: "GET",
                }),
            })
            .catch(error => {
                console.log({ url, error: error.toString() });
                Logger.error(error.data, { url, businessId: business.id });
                t.rollback();
                return res.status(error.response?.status || 500).json({
                    message:
                        error.response?.statusText ||
                        "Ha ocurrido un error interno. Por favor consulte al administrador.",
                });
            });

        if (checkerResponse(response)) {
            //Countries Woo
            const data: Array<{
                name: string;
                code: string;
                states: Array<{
                    name: string;
                    code: string;
                }>;
            }> = response.data;
            const countriesWithStates = data.filter(
                item => item.states.length !== 0
            );

            //Countries defined
            const allCountries = await Country.findAll();

            let bulkProvinces: any = [];
            for (const country of countriesWithStates) {
                const found = allCountries.find(
                    item => item.code === country.code
                );

                if (found) {
                    const list = country.states.map(item => {
                        return {
                            code: item.code,
                            name: item.name,
                            countryId: found.id,
                        };
                    });
                    bulkProvinces = bulkProvinces.concat(list);
                }
            }

            await Province.bulkCreate(bulkProvinces, {
                transaction: t,
            });

            await t.commit();

            res.status(200).json(bulkProvinces);
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        console.log(error);
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
