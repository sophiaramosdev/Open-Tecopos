import { Response } from "express";
import User from "../../database/models/user";
import { Op, col, fn, or, where } from "sequelize";
import Coupon from "../../database/models/coupon";
import moment from "moment";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import CurrencyPayment from "../../database/models/currencyPayment";
import OrderReceipt from "../../database/models/orderReceipt";
import Logger from "../../lib/logger";
import Price from "../../database/models/price";
import Client from "../../database/models/client";
import db from "../../database/connection";
import Business from "../../database/models/business";
import ConfigurationKey from "../../database/models/configurationKey";
import ShippingAddress from "../../database/models/shippingAddress";
import BillingAddress from "../../database/models/billingAddress";
import OrderReceiptRecord from "../../database/models/orderReceiptRecord";
import {
    getTitleOrderRecord,
    getTitleReservationRecord,
} from "../../helpers/translator";
import { ItemProductSelled, SimpleProductItem } from "../../interfaces/models";
import {
    afterOrderCancelled,
    calculateOrderTotalV2,
    restoreProductStockDisponibility,
    substractProductStockDisponibility,
} from "../helpers/products";
import {
    exchangeCurrency,
    getPriceExchanged,
    getProductPrice,
    internalCheckerResponse,
    mathOperation,
    obtainingProductPriceSystemPriceDefined,
    truncateValue,
} from "../../helpers/utils";
import { processCoupons } from "../helpers/coupons";
import ListUsedClientsCoupon from "../../database/models/listUsedClientsCoupon";
import OrderReceiptCoupon from "../../database/models/orderReceiptCoupon";
import AvailableCurrency from "../../database/models/availableCurrency";
import { productQueue } from "../../bull-queue/product";
import { emailQueue } from "../../bull-queue/email";
import { config_transactions } from "../../database/seq-transactions";
import Product from "../../database/models/product";
import SelledProductAddon from "../../database/models/selledProductAddon";
import SelledProduct from "../../database/models/selledProduct";
import AccessPointTicket from "../../database/models/accessPointTicket";
import Dispatch from "../../database/models/dispatch";
import Area from "../../database/models/area";
import PriceSystem from "../../database/models/priceSystem";
import EconomicCycle from "../../database/models/economicCycle";
import { socketQueue } from "../../bull-queue/socket";
import { wooQueue } from "../../bull-queue/wocommerce";
import Resource from "../../database/models/resource";
import CashRegisterOperation from "../../database/models/cashRegisterOperation";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import Variation from "../../database/models/variation";
import { pag_params } from "../../database/pag_params";
import ProductionTicket from "../../database/models/productionTicket";
import {
    order_origin,
    order_receipt_status,
    payments_ways,
} from "../../interfaces/nomenclators";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import {
    getActiveEconomicCycleCache,
    getAreaCache,
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
import { SimplePrice } from "../../interfaces/commons";
import PartialPayment from "../../database/models/partialPayment";
import PrepaidPayment from "../../database/models/prepaidPayment";
import { getAllBranchBusiness, getDiffDays } from "../helpers/utils";
import ProductPrice from "../../database/models/productPrice";
import Supply from "../../database/models/supply";
import SalesCategory from "../../database/models/salesCategory";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import OrderReceiptModifier from "../../database/models/orderReceiptModifier";
import Image from "../../database/models/image";
import Combo from "../../database/models/Combo";
import ReservationRecord from "../../database/models/reservationRecord";
import DispatchProduct from "../../database/models/dispatchProduct";

export const findAllOrders = async (req: any, res: Response) => {
    try {
        //Enought time to process this request
        req.setTimeout(180000); //3 minutes = 60*3*1000

        const {
            per_page,
            page,
            status,
            order,
            orderBy,
            actives,
            paymentCurrencyCode,
            billFrom,
            billTo,
            dateFrom,
            dateTo,
            paidFrom,
            paidTo,
            origin,
            search,
            productName,
            hasDiscount,
            paymentWay,
            deliveryAt,
            coupons,
            productId,
            getOverduePayments,
            partialPayment,
            prepaidPayment,
            isPreReceipt,
            paymentDeadlineFrom,
            paymentDeadlineTo,
            searchNumber,
            operationNumber,
            preOperationNumber,
            minTotalToPay,
            maxTotalToPay,
            currency,
            withCashRegisterOperations,
            all_data,
            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "isForTakeAway",
            "managedById",
            "createdAt",
            "areaSalesId",
            "economicCycleId",
            "houseCosted",
            "discount",
            "clientId",
            "origin",
            "modifiedPrice",
            "pickUpInStore",
            "operationNumber",
            "shippingById",
            "preOperationNumber",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (operationNumber) {
            where_clause.operationNumber = operationNumber;
            where_clause.isPreReceipt = false;
        }
        if (preOperationNumber) {
            where_clause.preOperationNumber = preOperationNumber;
            where_clause.isPreReceipt = true;
        }

        if (searchNumber) {
            where_clause = {
                ...where_clause,
                [Op.or]: [
                    { operationNumber: searchNumber },
                    { preOperationNumber: searchNumber },
                ],
            };
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (origin) {
            const originTypes = origin.split(",");

            const allTypes: order_origin[] = [
                "pos",
                "admin",
                "shop",
                "marketplace",
                "apk",
            ];

            for (const item of originTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} no es un origen permitido. Campos permitidos: ${originTypes}`,
                    });
                }
            }

            where_clause.origin = {
                [Op.or]: originTypes,
            };
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["id", "DESC"]];
        }

        if (status) {
            const statusTypes = status.split(",");

            where_clause.status = {
                [Op.or]: statusTypes,
            };
        }

        if (getOverduePayments) {
            const today = moment();
            where_clause["paymentDeadlineAt"] = {
                [Op.lte]: today,
            };
            where_clause["status"] = {
                [Op.eq]: "PAYMENT_PENDING",
            };
        }

        //Including esential rows
        let includeBody: any = [
            {
                model: Client,
                attributes: ["firstName", "lastName", "email", "codeClient"],
            },
        ];

        let clauseOrderReceiptTotal: any = {
            model: OrderReceiptTotal,
            attributes: ["amount", "codeCurrency"],
        };

        if (partialPayment) {
            includeBody.push({
                model: PartialPayment,
                attributes: [
                    "id",
                    "paymentNumber",
                    "amount",
                    "codeCurrency",
                    "observations",
                    "paymentWay",
                    "createdAt",
                ],
            });
        }

        if (prepaidPayment) {
            includeBody.push({
                model: PrepaidPayment,
                attributes: [
                    "id",
                    "paymentNumber",
                    "paymentNumberClient",
                    "status",
                    "amount",
                    "description",
                    "codeCurrency",
                    "paymentWay",
                    "createdAt",
                ],
            });
        }

        if (coupons) {
            const allCoupos = coupons.split(",");
            includeBody.push({
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                where: {
                    code: {
                        [Op.or]: allCoupos,
                    },
                },
            });
        }

        if (withCashRegisterOperations) {
            includeBody.push({
                model: CashRegisterOperation,
                required: true,
                attributes: [
                    "id",
                    "amount",
                    "codeCurrency",
                    "operation",
                    "type",
                    "madeById",
                    "orderReceiptId",
                ],
            });
            where_clause = {
                ...where_clause,
            };
        }

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

        //Date paidAt filtering
        if (billFrom && billTo) {
            //Special case between dates
            where_clause["paidAt"] = {
                [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };

            ordenation = [["paidAt", "DESC"]];
        } else {
            if (billFrom) {
                where_clause["paidAt"] = {
                    [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };

                ordenation = [["paidAt", "DESC"]];
            }

            if (billTo) {
                where_clause["paidAt"] = {
                    [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };

                ordenation = [["paidAt", "DESC"]];
            }
        }

        if (deliveryAt) {
            //Special case between dates
            where_clause["deliveryAt"] = {
                [Op.gte]: moment(deliveryAt, "YYYY-MM-DD")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(deliveryAt, "YYYY-MM-DD")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        }

        if (paidFrom || paidTo) {
            //Bill from and to
            const clauseTotalPay: any = {
                model: OrderReceiptPrice,
                attributes: ["id", "price", "codeCurrency"],
            };

            if (paidFrom && paidTo) {
                //Special case between amounts
                clauseTotalPay.where = {
                    price: {
                        [Op.gte]: paidFrom,
                        [Op.lte]: paidTo,
                    },
                };
            } else {
                if (paidFrom) {
                    clauseTotalPay.where = {
                        price: {
                            [Op.gte]: paidFrom,
                        },
                    };
                }

                if (paidTo) {
                    clauseTotalPay.where = {
                        price: {
                            [Op.lte]: paidTo,
                        },
                    };
                }
            }

            includeBody.push(clauseTotalPay);
        }

        //Searchable
        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.and] = [
                where(fn("unaccent", col("OrderReceipt.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        if (hasDiscount === "true") {
            where_clause[Op.and] = {
                discount: {
                    [Op.gt]: 0,
                },
            };
        }

        //Payment way
        let clausePaymentWay: any = {
            model: CurrencyPayment,
            attributes: ["id", "amount", "codeCurrency", "paymentWay"],
        };

        if (paymentWay || paymentCurrencyCode) {
            if (paymentWay && paymentCurrencyCode) {
                const paymentTypes = paymentWay.split(",");

                const allTypes = ["CASH", "TRANSFER"];

                for (const item of paymentTypes) {
                    if (!allTypes.includes(item)) {
                        return res.status(400).json({
                            message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                        });
                    }
                }
                clausePaymentWay.where = {
                    paymentWay: paymentTypes,
                    codeCurrency: paymentCurrencyCode,
                };
            } else {
                if (paymentWay) {
                    const paymentTypes = paymentWay.split(",");

                    const allTypes = ["CASH", "TRANSFER"];

                    for (const item of paymentTypes) {
                        if (!allTypes.includes(item)) {
                            return res.status(400).json({
                                message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                            });
                        }
                    }
                    clausePaymentWay.where = {
                        paymentWay: paymentTypes,
                    };
                }

                if (paymentCurrencyCode) {
                    clausePaymentWay.where = {
                        codeCurrency: paymentCurrencyCode,
                    };
                }
            }

            includeBody.push(clausePaymentWay);
        }

        if (isPreReceipt === "true") {
            where_clause.isPreReceipt = isPreReceipt;
        }
        if (isPreReceipt === "false") {
            where_clause.isPreReceipt = {
                [Op.or]: [false, null],
            };
        }

        if (paymentDeadlineFrom && paymentDeadlineTo) {
            where_clause.paymentDeadlineAt = {
                [Op.gte]: moment(paymentDeadlineFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(paymentDeadlineTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.not]: null,
            };
            where_clause.isPreReceipt = true;
        } else {
            if (paymentDeadlineFrom) {
                where_clause.paymentDeadlineAt = {
                    [Op.gte]: moment(paymentDeadlineFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                    [Op.not]: null,
                };
                where_clause.isPreReceipt = true;
            }

            if (paymentDeadlineTo) {
                where_clause.paymentDeadlineAt = {
                    [Op.lte]: moment(paymentDeadlineTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                    [Op.not]: null,
                };
                where_clause.isPreReceipt = true;
            }
        }

        //Filtering orderReceiptTotals
        if (minTotalToPay && maxTotalToPay && currency) {
            clauseOrderReceiptTotal.where = {
                amount: {
                    [Op.gte]: parseFloat(minTotalToPay),
                    [Op.lte]: parseFloat(maxTotalToPay),
                },
                codeCurrency: currency,
            };
        } else {
            if (minTotalToPay && currency) {
                clauseOrderReceiptTotal.where = {
                    amount: {
                        [Op.gte]: parseFloat(minTotalToPay),
                    },
                    codeCurrency: currency,
                };
            }

            if (maxTotalToPay && currency) {
                clauseOrderReceiptTotal.where = {
                    amount: {
                        [Op.lte]: parseFloat(maxTotalToPay),
                    },
                    codeCurrency: currency,
                };
            }
        }

        includeBody.push(clauseOrderReceiptTotal);

        //With pagination
        let limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        //Filtering according role
        if (user.roles?.some(item => item.code === "MARKETING_SALES")) {
            where_clause["managedById"] = user.id;
            where_clause["isPreReceipt"] = true;
        } else if (user.roles?.some(item => item.code === "MANAGER_SALES")) {
            let conditionals: any = [
                {
                    createdAt: {
                        [Op.gte]: moment(new Date(), "YYYY-MM-DD HH:mm")
                            .startOf("day")
                            .format("YYYY-MM-DD HH:mm:ss"),
                    },
                },
                {
                    isPreReceipt: true,
                },
            ];

            if (economicCycle) {
                conditionals.push({
                    economicCycleId: economicCycle.id,
                });
            }

            where_clause[Op.or] = conditionals;
        } else if (user.roles?.some(item => item.code === "MANAGER_SHIFT")) {
            const last7Cycles = await EconomicCycle.findAll({
                where: {
                    businessId: user.businessId,
                },
                limit: 7,
                order: [["createdAt", "DESC"]],
            });

            const lastEconomicCycleOpenAt =
                last7Cycles[last7Cycles.length - 1].openDate;

            let conditionals: any = [
                {
                    isPreReceipt: true,
                },
            ];

            conditionals.push({
                createdAt: {
                    [Op.gte]: moment(
                        lastEconomicCycleOpenAt,
                        "YYYY-MM-DD HH:mm"
                    )
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                },
            });
            where_clause[Op.or] = conditionals;
        }

        const found_orders = await OrderReceipt.findAndCountAll({
            attributes: [
                "id",
                "name",
                "status",
                "discount",
                "observations",
                "numberClients",
                "closedDate",
                "isForTakeAway",
                "createdAt",
                "updatedAt",
                "businessId",
                "operationNumber",
                "preOperationNumber",
                "houseCosted",
                "totalCost",
                "modifiedPrice",
                "customerNote",
                "origin",
                "paidAt",
                "pickUpInStore",
                "shippingById",
                "deliveryAt",
                "registeredAt",
                "paymentDeadlineAt",
                "isPreReceipt",
            ],
            distinct: true,
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: includeBody,
            limit: all_data ? undefined : limit,
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
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getBillingOrder = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        let order = await OrderReceipt.scope("full_details").findByPk(id);

        if (!order) {
            return res.status(404).json({
                message: `Orden no encontrada`,
            });
        }

        //Permission Check
        if (order?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        res.status(200).json(order);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const newPreBillingOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    //@ts-ignore
    const tId = t.id;
    try {
        const user: User = req.user;
        const business: Business = req.business;
        const {
            products,
            coupons,
            customerNote,
            shippingPrice,
            definedCodeCurrency,
            clientId,
            paymentInstallment,
            managedById,
            currenciesPayment,
            pickUpInStore,
            name,
            areaSalesId,
            houseCosted,
            registeredAt,
            paymentDeadlineAt,
            modifiedPrices,
            ...params
        } = req.body;

        if (!clientId) {
            t.rollback();
            return res.status(400).json({
                message: `Debe proporcionar al cliente al que se va a asociar la factura .`,
            });
        }

        const client = await Client.findOne({
            where: {
                id: clientId,
            },
        });

        if (!client) {
            t.rollback();
            return res.status(400).json({
                message: `El cliente seleccionado no existe en su negocio.`,
            });
        }

        const area = await getAreaCache(areaSalesId);

        if (!area || !area?.isActive) {
            t.rollback();
            return res.status(404).json({
                message: `Área Ventas no encontradas`,
            });
        }

        //Checking if action belongs to user Business
        if (area.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (area.type !== "SALE") {
            t.rollback();
            return res.status(406).json({
                message: `El área proporcionada no es un tipo de VENTA`,
            });
        }
        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        let orderTemplate: Partial<OrderReceipt> | any = {
            status: "CREATED",
            businessId: user.businessId,
            managedById: managedById,
            customerNote,
            origin: "admin",
            clientId: client?.id,
            name,
            pickUpInStore,
            discount: Number(params.discount) || 0,
            commission: Number(params.commission) || 0,
            observations: params.observations || "",
            isForTakeAway: params.isForTakeAway,
            houseCosted,
            areaSalesId,
            economicCycleId: economicCycle.id,
            registeredAt: registeredAt ?? new Date(),
            isPreReceipt: true,
            paymentDeadlineAt,
        };

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        let listRecordsCache = [];
        const productsToSell: Array<ItemProductSelled> = [];
        for (let element of products) {
            productsToSell.push({
                productId: Number(element.productId),
                quantity: Number(element.quantity),
                variationId: element.variationId,
                addons: element.addons,
                priceUnitary: element?.priceUnitary,
            });
        }

        //Analyzing cache for configurations
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        //Generals
        let addBulkSelledProduct: Array<any> = [];
        let listProductsToRecord = [];
        let generalTotalCost = 0;

        let productsReceived = [...products];

        //Analyzing if COMBO products are found
        const productCombos = await Product.findAll({
            where: {
                type: "COMBO",
                id: products.map((item: any) => item.productId),
            },
            include: [
                {
                    model: Combo,
                    as: "compositions",
                    include: [
                        {
                            model: Product,
                            as: "composed",
                            include: [
                                {
                                    model: Area,
                                    as: "listProductionAreas",
                                    attributes: ["id", "name"],
                                    through: {
                                        attributes: [],
                                    },
                                },
                            ],
                        },
                        { model: Variation },
                    ],
                },
            ],
        });

        if (productCombos.length !== 0) {
            productCombos.forEach(combo => {
                const comboQuantity =
                    productsReceived.find(item => item.productId === combo.id)
                        ?.quantity || 1;
                combo.compositions.forEach(item => {
                    const foundProductionArea =
                        item.composed?.listProductionAreas?.[0];

                    productsReceived.push({
                        productId: item.composedId,
                        quantity: item.quantity * comboQuantity,
                        productionAreaId: foundProductionArea?.id,
                        variationId: item.variationId,
                        addons: [],
                    });
                });
            });
        }

        //Finding and dividing products according type
        const ids = productsReceived.map(item => item.productId);

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
        const foundVariations = await Variation.findAll({
            where: {
                id: idsVariations,
            },
        });

        for (const selledProduct of products) {
            //Analyzing if where found
            const productDetails = productsFound.find(
                item => item.id === selledProduct.productId
            );

            if (!productDetails) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${selledProduct.productId} no fue encontrado.`,
                });
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
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
                });
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
                    t.rollback();
                    return res.status(404).json({
                        message: `La variación del producto ${productDetails.name} no fue encontrada.`,
                    });
                }

                if (variation.imageId) {
                    selled_product.imageId = variation.imageId;
                } else {
                    selled_product.imageId = productDetails.images?.[0]?.id;
                }
            } else {
                selled_product.imageId = productDetails.images?.[0]?.id;
            }

            //----> Analyzing if price is modified and taking basePrice
            //Searching price
            let found = false;
            let basePrice = {
                amount: 0,
                codeCurrency: "",
            };

            //1. Trying to find according currency
            const foundCommonCurrency = productDetails.prices.filter(
                item =>
                    item.codeCurrency ===
                    selledProduct.priceUnitary?.codeCurrency
            );

            if (
                foundCommonCurrency.some(
                    item => item.price === selledProduct.priceUnitary?.amount
                )
            ) {
                found = true;
            }

            if (foundCommonCurrency.length === 1) {
                basePrice.amount = foundCommonCurrency[0].price;
                basePrice.codeCurrency = foundCommonCurrency[0].codeCurrency;
            } else if (foundCommonCurrency.length > 1) {
                const mainPrice = foundCommonCurrency.find(item => item.isMain);

                if (mainPrice) {
                    basePrice.amount = mainPrice.price;
                    basePrice.codeCurrency = mainPrice.codeCurrency;
                }
            }

            //2.Trying to find according exchange rate
            if (foundCommonCurrency.length === 0) {
                for (const price of productDetails.prices) {
                    const convertion = exchangeCurrency(
                        {
                            amount: price.price,
                            codeCurrency: price.codeCurrency,
                        },
                        selledProduct.priceUnitary.codeCurrency,
                        availableCurrencies || [],
                        3
                    );

                    //Taking into account that number must be calculate in ceil mode
                    const rounding = Number(convertion?.amount.toFixed(2));

                    if (price.isMain) {
                        basePrice.amount = convertion?.amount || 0;
                        basePrice.codeCurrency = convertion?.codeCurrency || "";
                    }

                    if (rounding === selledProduct.priceUnitary?.amount) {
                        found = true;
                        break;
                    }
                }
            }
            // ---> END ANALYSIS

            let totalAmountPrice = mathOperation(
                selledProduct.priceUnitary.amount,
                selledProduct.quantity,
                "multiplication",
                3
            );
            totalAmountPrice = truncateValue(totalAmountPrice, 2);

            selled_product = {
                ...selled_product,
                economicCycleId: economicCycle?.id,
                priceUnitary: {
                    amount: selledProduct.priceUnitary.amount,
                    codeCurrency: selledProduct.priceUnitary.codeCurrency,
                },
                priceTotal: {
                    amount: totalAmountPrice,
                    codeCurrency: selledProduct.priceUnitary.codeCurrency,
                },
                baseUnitaryPrice: {
                    amount: basePrice.amount,
                    codeCurrency: basePrice.codeCurrency,
                },
                observations: selledProduct.observations,
                modifiedPrice: !found,
            };

            listProductsToRecord.push(
                `(x${selledProduct.quantity}) ${productDetails.name}`
            );

            if (
                ["MENU", "ADDON", "SERVICE", "COMBO"].includes(
                    productDetails.type
                )
            ) {
                selled_product.status = "RECEIVED";
            } else {
                selled_product.status = "COMPLETED";
                selled_product.areaId = area.stockAreaId;
            }

            //Adding selled product to the virtual store for creating at the end and updating total price
            addBulkSelledProduct.push({
                ...selled_product,
                totalCost: totalSelledCost,
            });

            generalTotalCost += totalSelledCost;
        }

        orderTemplate.selledProducts = addBulkSelledProduct;
        orderTemplate.totalCost = generalTotalCost;

        listRecordsCache.push({
            action: "PRODUCT_ADDED",
            title: getTitleOrderRecord("PRODUCT_ADDED"),
            details: listProductsToRecord.join(";"),
            madeById: user.id,
            createdAt: new Date(),
            isPublic: true,
        });

        //Updating cache
        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Setting totals
        const result_totals = await calculateOrderTotalV2(user.businessId, t);

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newPreBillingOrder/calculateOrderTotalV2",
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

        orderTemplate = await getOrderFromCacheTransaction(
            user.businessId,
            tId
        );

        orderTemplate.preOperationNumber = lastPreOperationNumber;
        orderTemplate.operationNumber = null;

        const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
            include: [
                OrderReceiptPrice,
                OrderReceiptTotal,
                { model: Price, as: "tipPrice" },
                { model: Price, as: "couponDiscountPrice" },
                { model: Price, as: "shippingPrice" },
                {
                    model: SelledProduct,
                    include: [
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                        { model: Price, as: "baseUnitaryPrice" },
                    ],
                },
            ],
        });

        await order.save({ transaction: t });

        //Preparing data to return
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
            order.id,
            {
                transaction: t,
            }
        );

        await t.commit();
        res.status(200).json(order_to_emit);

        listRecordsCache.push({
            action: "ORDER_CREATED",
            title: getTitleOrderRecord("ORDER_CREATED"),
            details: `Pre-Factura generada desde Administración`,
            madeById: user.id,
            orderReceiptId: order.id,
            isPublic: true,
        });

        if (listRecordsCache.length !== 0) {
            orderQueue.add(
                {
                    code: "REGISTER_RECORDS",
                    params: {
                        records: listRecordsCache,
                        orderId: order.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error.toString(), {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
            businessName: req.business.name,
            userName: req.user.username,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

interface SelledProductV2 {
    selledProductId: number;
    observations: string;
    quantity: number;
    restore: boolean;
    priceUnitary: SimplePrice;
    sellId: number;
}
export const cancelBillingOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    //@ts-ignore
    const tId = t.id;
    try {
        const { id } = req.params;
        const user: User = req.user;
        const business: Business = req.business;
        const { notes } = req.body;

        //Validations
        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const order = await OrderReceipt.findByPk(id, {
            include: [
                CurrencyPayment,
                CashRegisterOperation,
                {
                    model: SelledProduct,
                    required: false,
                    include: [
                        {
                            model: SelledProductAddon,
                            include: [Product],
                        },
                    ],
                },
                AccessPointTicket,
                Dispatch,
                Area,
                {
                    model: Resource,
                    as: "listResources",
                    through: {
                        attributes: [],
                    },
                },
            ],
            transaction: t,
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `Pedido no encontrado o no disponible`,
            });
        }

        //Checking if action belongs to user Business
        if (order.businessId !== order.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (order.status === "CANCELLED") {
            t.rollback();
            return res.status(400).json({
                message: `La orden ya ha sido cancelada. Por favor elimine esta instancia para poder continuar.`,
            });
        }

        if (order.dispatch?.status === "ACCEPTED") {
            t.rollback();
            return res.status(400).json({
                message: `La orden no puede ser cancelada debido a que su despacho asociado fue aceptado.`,
            });
        }

        if (order.status === "REFUNDED") {
            await t.rollback();
            return res.status(400).json({
                message: `La orden no puede ser cancelada debido a que ha sido reembolsada.`,
            });
        }

        if (order.status === "BILLED" && !order.createdInActualCycle) {
            await t.rollback();
            return res.status(400).json({
                message: `La orden no puede ser cancelada debido a que ya ha sido facturada en otro ciclo económico.`,
            });
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay un ciclo económico abierto.`,
            });
        }

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(order),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Sockets
        let toUpdateInProductionArea: Array<{
            product_selled: Partial<SelledProductV2>;
            takeAction: boolean;
            areaId: number;
            productionTicketId: number;
        }> = [];

        //General variables
        order.status = "CANCELLED";

        //in case the prefacture not restoreProductStockDisponibility
        if (!order.isPreReceipt) {
            const area = await getAreaCache(order.areaSalesId);

            if (!area || !area?.isActive) {
                t.rollback();
                return res.status(404).json({
                    message: `Área no encontrada`,
                });
            }

            if (area.businessId !== user.businessId) {
                t.rollback();
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

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
                    stockAreaId: area.stockAreaId,
                    businessId: user.businessId,
                    userId: user.id,
                    isAtSameEconomicCycle:
                        order.createdInActualCycle === undefined ||
                        order.createdInActualCycle,
                },
                t
            );

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.error(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "cancelBillingOrder/restoreProductStockDisponibility",
                        businessId: user.businessId,
                        userId: user.id,
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }

            for (const product_selled of order.selledProducts) {
                if (
                    ["MENU", "SERVICE", "ADDON"].includes(product_selled.type)
                ) {
                    if (product_selled.productionAreaId) {
                        toUpdateInProductionArea.push({
                            product_selled: {
                                selledProductId: product_selled.id,
                                observations: product_selled.observations,
                                quantity: product_selled.quantity,
                                restore: true,
                            },
                            takeAction: false,
                            productionTicketId:
                                product_selled.productionTicketId,
                            areaId: product_selled.productionAreaId,
                        });
                    }
                }
            }

            await afterOrderCancelled(
                {
                    businessId: order.businessId,
                    listResources: order.listResources,
                },
                t
            );

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.error(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "cancelOrder/afterOrderCancelled",
                        businessId: user.businessId,
                        userId: user.id,
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }

            productQueue.add(
                {
                    code: "CHECKING_PRODUCT",
                    params: {
                        productsIds: result.data.affectedProducts,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        let details = "";

        if (order.isPreReceipt) {
            details = "Prefactura cancelada desde Administración.";
        } else {
            details = `Orden cancelada desde Administración.`;
        }

        if (notes) {
            details.concat(` ${notes}.`);
        }

        //Registering actions
        const record = {
            action: "ORDER_CANCELLED",
            title: getTitleOrderRecord("ORDER_CANCELLED"),
            details,
            orderReceiptId: order.id,
            madeById: user.id,
        };

        await order.save({ transaction: t });

        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
            order.id,
            {
                transaction: t,
            }
        );

        //Analyzing cache for configurations
        const configurations = await getBusinessConfigCache(user.businessId);

        await t.commit();
        res.status(200).json(order_to_emit);

        if (order_to_emit?.isReservation) {
            //register reservation records
            let listRecordsReservation: Partial<ReservationRecord>[] = [];
            order_to_emit?.selledProducts.forEach(item => {
                listRecordsReservation.push({
                    action: "RESERVATION_CANCELLED",
                    title: getTitleReservationRecord("RESERVATION_CANCELLED"),
                    details: `La reserva fue cancelada.`,
                    madeById: user.id,
                    status: order.status,
                    selledProductId: item.id,
                });
            });
            if (listRecordsReservation.length > 0) {
                await ReservationRecord.bulkCreate(listRecordsReservation);
            }

            // send notification mail
            const config_message_cancellation =
                configurations.find(
                    item => item.key === "config_message_cancellation"
                )?.value === "true";
            if (config_message_cancellation && order_to_emit?.client?.email) {
                emailQueue.add(
                    {
                        code: "NOTIFICATION_RESERVATIONS",
                        params: {
                            email: order_to_emit?.client?.email,
                            business,
                            order_to_emit,
                            type: "RESERVATION_CANCELLATION",
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            }
        }

        orderQueue.add(
            {
                code: "REGISTER_RECORDS",
                params: {
                    records: [record],
                    orderId: order.id,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        // if (isWooActive) {
        //     wooQueue.add(
        //         {
        //             code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
        //             params: {
        //                 products: order.selledProducts.map(
        //                     item => item.productId
        //                 ),
        //                 businessId: user.businessId,
        //             },
        //         },
        //         { attempts: 2, removeOnComplete: true, removeOnFail: true }
        //     );
        // }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const newBillingOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    //@ts-ignore
    const tId = t.id;
    try {
        const user: User = req.user;
        const business: Business = req.business;
        const {
            areaSalesId,
            products,
            currenciesPayment,
            houseCosted,
            coupons,
            clientId,
            billing,
            shipping,
            customerNote,
            shippingPrice,
            amountReturned,
            registeredAt,
            managedById,
            discount,
            commission,
            observations,
            name,
            registeredPayments,
            paymentDeadlineAt,
            pickUpInStore,
            includeInArea,
            ...params
        } = req.body;

        if (!clientId) {
            t.rollback();
            return res.status(400).json({
                message: `Debe proporcionar al cliente al que se va a asociar la factura .`,
            });
        }

        if (!areaSalesId) {
            t.rollback();
            return res.status(406).json({
                message: `No fue proporcionada ningún área de venta.`,
            });
        }

        const area = await getAreaCache(areaSalesId);

        if (!area || !area?.isActive) {
            t.rollback();
            return res.status(404).json({
                message: `Área no encontrada`,
            });
        }

        if (area.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (area.type !== "SALE") {
            t.rollback();
            return res.status(406).json({
                message: `El área proporcionada no es de tipo VENTA`,
            });
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        //Checking client
        const client = await Client.findOne({
            where: {
                id: clientId,
            },
        });

        if (!client) {
            t.rollback();
            return res.status(400).json({
                message: `El cliente seleccionado no existe en su negocio.`,
            });
        }

        let orderTemplate: Partial<OrderReceipt> | any = {
            managedById: managedById,
            salesById: user.id,
            status: "PAYMENT_PENDING",
            businessId: user.businessId,
            economicCycleId: economicCycle.id,
            areaSalesId,
            name: params.name || ``,
            discount: Number(params.discount) || 0,
            commission: Number(params.commission) || 0,
            observations: observations || null,
            houseCosted: houseCosted ?? false,
            clientId: clientId,
            origin: "admin",
            registeredAt: registeredAt ?? new Date(),
            shipping,
            billing,
            shippingPrice,
            currenciesPayment: [],
            cashRegisterOperations: [],
            paymentDeadlineAt: paymentDeadlineAt,
            pickUpInStore,
        };

        if (shippingPrice) {
            orderTemplate.shippingPrice = {
                amount: shippingPrice.amount,
                codeCurrency: shippingPrice.codeCurrency,
            };
        }

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        let listRecords = [
            {
                action: "ORDER_CREATED",
                title: getTitleOrderRecord("ORDER_CREATED"),
                details: `Orden creada desde administración y pendiente a cobro.`,
                madeById: user.id,
                createdAt: params.createdAt,
                isPublic: true,
            },
        ];

        //Analyzing cache for configurations
        const configurations = await getBusinessConfigCache(user.businessId);
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const shouldGenerateProductionTickets =
            configurations.find(
                item =>
                    item.key === "generate_ticket_for_production_in_fast_orders"
            )?.value === "true";

        const enable_to_sale_in_negative =
            configurations.find(
                item => item.key === "enable_to_sale_in_negative"
            )?.value === "true";

        //1. Normalize products to Sell and register
        const productsToSell: Array<ItemProductSelled> = [];
        for (let element of products) {
            productsToSell.push({
                productId: Number(element.productId),
                quantity: Number(element.quantity),
                variationId: element.variationId,
                addons: element.addons,
                priceUnitary: element?.priceUnitary,
            });
        }

        const result = await substractProductStockDisponibility(
            {
                products: productsToSell,
                stockAreaId: area.stockAreaId,
                businessId: user.businessId,
                strict: !enable_to_sale_in_negative,
            },
            t
        );

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                origin: "newBillingOrder/substractProductStockDisponibility",
                businessId: user.businessId,
                userId: user.id,
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        //Generals
        let addBulkSelledProduct: Array<any> = [];
        let listProductsToRecord = [];
        let generalTotalCost = 0;

        const productsFound = await getStoreProductsCache(user.businessId, tId);

        //Obtaining all variations
        const idsVariations = productsToSell
            .filter(item => item.variationId)
            .map(item => item.variationId);
        const foundVariations = await Variation.findAll({
            where: {
                id: idsVariations,
            },
        });

        for (const selledProduct of products) {
            //Analyzing if where found
            const productDetails = productsFound.find(
                item => item.id === selledProduct.productId
            );

            if (!productDetails) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${selledProduct.productId} no fue encontrado.`,
                });
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
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
                });
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
                    t.rollback();
                    return res.status(404).json({
                        message: `La variación del producto ${productDetails.name} no fue encontrada.`,
                    });
                }

                if (variation.imageId) {
                    selled_product.imageId = variation.imageId;
                } else {
                    selled_product.imageId = productDetails.images?.[0]?.id;
                }
            } else {
                selled_product.imageId = productDetails.images?.[0]?.id;
            }

            //----> Analyzing if price is modified and taking basePrice
            //Searching price
            let found = false;
            let basePrice = {
                amount: 0,
                codeCurrency: "",
            };

            //1. Trying to find according currency
            const foundCommonCurrency = productDetails.prices.filter(
                item =>
                    item.codeCurrency ===
                    selledProduct.priceUnitary?.codeCurrency
            );

            if (
                foundCommonCurrency.some(
                    item => item.price === selledProduct.priceUnitary?.amount
                )
            ) {
                found = true;
            }

            if (foundCommonCurrency.length === 1) {
                basePrice.amount = foundCommonCurrency[0].price;
                basePrice.codeCurrency = foundCommonCurrency[0].codeCurrency;
            } else if (foundCommonCurrency.length > 1) {
                const mainPrice = foundCommonCurrency.find(item => item.isMain);

                if (mainPrice) {
                    basePrice.amount = mainPrice.price;
                    basePrice.codeCurrency = mainPrice.codeCurrency;
                }
            }

            //2.Trying to find according exchange rate
            if (foundCommonCurrency.length === 0) {
                for (const price of productDetails.prices) {
                    const convertion = exchangeCurrency(
                        {
                            amount: price.price,
                            codeCurrency: price.codeCurrency,
                        },
                        selledProduct.priceUnitary.codeCurrency,
                        availableCurrencies || [],
                        3
                    );

                    //Taking into account that number must be calculate in ceil mode
                    const rounding = Number(convertion?.amount.toFixed(2));

                    if (price.isMain) {
                        basePrice.amount = convertion?.amount || 0;
                        basePrice.codeCurrency = convertion?.codeCurrency || "";
                    }

                    if (rounding === selledProduct.priceUnitary?.amount) {
                        found = true;
                        break;
                    }
                }
            }
            // ---> END ANALYSIS

            let totalAmountPrice = mathOperation(
                selledProduct.priceUnitary.amount,
                selledProduct.quantity,
                "multiplication",
                3
            );
            totalAmountPrice = truncateValue(totalAmountPrice, 2);

            selled_product = {
                ...selled_product,
                economicCycleId: economicCycle?.id,
                priceUnitary: {
                    amount: selledProduct.priceUnitary.amount,
                    codeCurrency: selledProduct.priceUnitary.codeCurrency,
                },
                priceTotal: {
                    amount: totalAmountPrice,
                    codeCurrency: selledProduct.priceUnitary.codeCurrency,
                },
                baseUnitaryPrice: {
                    amount: basePrice.amount,
                    codeCurrency: basePrice.codeCurrency,
                },
                observations: selledProduct.observations,
                modifiedPrice: !found,
            };

            listProductsToRecord.push(
                `(x${selledProduct.quantity}) ${productDetails.name}`
            );

            if (
                ["MENU", "ADDON", "SERVICE", "COMBO"].includes(
                    productDetails.type
                )
            ) {
                selled_product.status = "RECEIVED";
            } else {
                selled_product.status = "COMPLETED";
                selled_product.areaId = area.stockAreaId;
            }

            //Adding selled product to the virtual store for creating at the end and updating total price
            addBulkSelledProduct.push({
                ...selled_product,
                totalCost: totalSelledCost,
            });

            generalTotalCost += totalSelledCost;
        }

        orderTemplate.selledProducts = addBulkSelledProduct;
        orderTemplate.totalCost = generalTotalCost;

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        listRecords.unshift({
            action: "PRODUCT_ADDED",
            title: getTitleOrderRecord("PRODUCT_ADDED"),
            details: listProductsToRecord.join(";"),
            madeById: user.id,
            createdAt: new Date(),
            isPublic: true,
        });

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
                message: `Todos los productos de la orden no fueron encontrados. Por favor, revise su orden y vuelva a intentarlo.`,
            });
        }

        const result_totals = await calculateOrderTotalV2(
            orderTemplate.businessId,
            t
        );

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newBillingOrder/calculateOrderTotalV2",
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: user.businessId,
                    userId: user.id,
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        let lastOperationNumber: number = await OrderReceipt.max(
            "operationNumber",
            {
                where: {
                    businessId: user.businessId,
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

        orderTemplate = await getOrderFromCacheTransaction(
            user.businessId,
            tId
        );
        orderTemplate.operationNumber = lastOperationNumber;

        const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
            include: [
                OrderReceiptPrice,
                OrderReceiptTotal,
                BillingAddress,
                ShippingAddress,
                { model: Price, as: "tipPrice" },
                { model: Price, as: "amountReturned" },
                { model: Price, as: "couponDiscountPrice" },
                { model: Price, as: "shippingPrice" },
                {
                    model: SelledProduct,
                    include: [
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                        { model: Price, as: "baseUnitaryPrice" },
                    ],
                },
                { model: CurrencyPayment, as: "currenciesPayment" },
                { model: CashRegisterOperation, as: "cashRegisterOperations" },
                { model: ProductionTicket, as: "tickets" },
                OrderReceiptModifier,
            ],
        });

        if (params.isPending) {
            order.status = "PAYMENT_PENDING";
        }

        await order.save({ transaction: t });

        //Preparing data to return
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
            order.id,
            {
                transaction: t,
            }
        );

        let listTickets: Array<ProductionTicket> = [];
        let preparation_areas: Array<number> = [];
        if (shouldGenerateProductionTickets && order_to_emit) {
            let bulkSelledUpdated: any = [];

            //Creating preparation areas
            order_to_emit.selledProducts.forEach(item => {
                if (
                    item.productionAreaId &&
                    !preparation_areas.includes(item.productionAreaId)
                ) {
                    preparation_areas.push(item.productionAreaId);
                }
            });

            let addBulkTickets = [];
            for (const area of preparation_areas) {
                addBulkTickets.push({
                    status: "RECEIVED",
                    areaId: area,
                    orderReceiptId: order_to_emit.id,
                    name:
                        order_to_emit.name ||
                        `#${order_to_emit.operationNumber}`,
                    productionNumber: 1,
                });
            }

            listTickets = await ProductionTicket.bulkCreate(addBulkTickets, {
                transaction: t,
                returning: true,
            });

            order_to_emit.selledProducts.forEach(item => {
                if (item.productionAreaId) {
                    const ticket_found = listTickets.find(
                        ticket => ticket.areaId === item.productionAreaId
                    );

                    if (ticket_found) {
                        bulkSelledUpdated.push({
                            id: item.id,
                            productionTicketId: ticket_found.id,
                            status: "RECEIVED",
                        });
                    }
                }
            });

            if (bulkSelledUpdated.length !== 0) {
                await SelledProduct.bulkCreate(bulkSelledUpdated, {
                    updateOnDuplicate: ["productionTicketId", "status"],
                    transaction: t,
                });
            }
        }

        await t.commit();

        res.status(200).json(order_to_emit);

        if (params.sendMail) {
            const emailTemplate = "NEW_ORDER_NOTIFICATION_ADMIN";
            emailQueue.add(
                {
                    code: emailTemplate,
                    params: {
                        email: client.email,
                        order_to_emit,
                        business,
                        type: "NEW_ORDEN_ADMIN",
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (listRecords.length !== 0) {
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
        }

        //Checking products
        if (result.data.affectedProducts) {
            productQueue.add(
                {
                    code: "CHECKING_PRODUCT",
                    params: {
                        productsIds: result.data.affectedProducts,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (listTickets.length !== 0) {
            socketQueue.add(
                {
                    code: "PROCESS_TICKETS_PRODUCTION_AREA",
                    params: {
                        order: order_to_emit,
                        listTickets,
                        preparation_areas,
                        deleteInPreparationArea: [],
                        from: user.id,
                        fromName: user.displayName || user.username,
                        origin: req.header("X-App-Origin"),
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const transformDispatchIntoBilling = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    //@ts-ignore
    const tId = t.id;
    try {
        const user: User = req.user;
        const { dispatchId } = req.params;
        const { areaSalesId, codeCurrencyToSale } = req.body;

        if (!dispatchId) {
            t.rollback();
            return res.status(400).json({
                message: `El parámetro id no fue encontrado.`,
            });
        }

        const moreBusiness = await getAllBranchBusiness(user);

        const dispatch = await Dispatch.findOne({
            where: {
                id: dispatchId,
                businessId: moreBusiness,
            },
            include: [
                DispatchProduct,
                { model: OrderReceipt, attributes: ["id"] },
            ],
            transaction: t,
        });

        if (!dispatch) {
            t.rollback();
            return res.status(400).json({
                message: `Despacho no encontrado.`,
            });
        }

        if (dispatch.status !== "CREATED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho no puede ser transformado a factura.`,
            });
        }

        if (dispatch.order) {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido asociado a una orden.`,
            });
        }

        if (!areaSalesId) {
            t.rollback();
            return res.status(406).json({
                message: `No fue proporcionada ningún área de venta.`,
            });
        }

        const area = await getAreaCache(areaSalesId);

        if (!area || !area?.isActive) {
            t.rollback();
            return res.status(404).json({
                message: `Área no encontrada`,
            });
        }

        if (area.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (area.type !== "SALE") {
            t.rollback();
            return res.status(406).json({
                message: `El área proporcionada no es de tipo VENTA`,
            });
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        let orderTemplate: Partial<OrderReceipt> | any = {
            managedById: user.id,
            status: "PAYMENT_PENDING",
            businessId: user.businessId,
            economicCycleId: economicCycle.id,
            areaSalesId,
            origin: "admin",
            registeredAt: new Date(),
            currenciesPayment: [],
            cashRegisterOperations: [],
        };

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        let listRecords = [
            {
                action: "ORDER_CREATED",
                title: getTitleOrderRecord("ORDER_CREATED"),
                details: `Orden creada a partir de un despacho y pendiente a cobro.`,
                madeById: user.id,
                createdAt: new Date(),
                isPublic: true,
            },
        ];

        //Analyzing cache for configurations
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        //Generals
        let addBulkSelledProduct: Array<any> = [];
        let listProductsToRecord = [];
        let generalTotalCost = 0;

        const productsFound = await Product.findAll({
            where: {
                id: dispatch.products.map(item => item.productId),
                businessId: user.businessId,
            },
            include: [
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
            ],
            transaction: t,
        });

        for (const selledProduct of dispatch.products) {
            //Analyzing if where found
            const productDetails = productsFound.find(
                item => item.id === selledProduct.productId
            );

            if (!productDetails) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${selledProduct.productId} no fue encontrado.`,
                });
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
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
                });
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
                imageId: productDetails.images?.[0]?.id,
                status: "COMPLETED",
            };

            //Finding product price
            let itemPrice = getProductPrice(
                productDetails,
                selledProduct.variationId,
                availableCurrencies,
                [economicCycle.priceSystemId.toString()],
                codeCurrencyToSale
            );

            if (!itemPrice) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${productDetails.name} no tiene un precio válido. Consulte al administrador.`,
                });
            }

            let totalAmountPrice = mathOperation(
                itemPrice.amount,
                selledProduct.quantity,
                "multiplication",
                3
            );
            totalAmountPrice = truncateValue(totalAmountPrice, 2);

            selled_product = {
                ...selled_product,
                economicCycleId: economicCycle?.id,
                priceUnitary: {
                    amount: itemPrice.amount,
                    codeCurrency: itemPrice.codeCurrency,
                },
                priceTotal: {
                    amount: totalAmountPrice,
                    codeCurrency: itemPrice.codeCurrency,
                },
                baseUnitaryPrice: {
                    amount: itemPrice.amount,
                    codeCurrency: itemPrice.codeCurrency,
                },
            };

            listProductsToRecord.push(
                `(x${selledProduct.quantity}) ${productDetails.name}`
            );

            //Adding selled product to the virtual store for creating at the end and updating total price
            addBulkSelledProduct.push({
                ...selled_product,
                totalCost: totalSelledCost,
            });

            generalTotalCost += totalSelledCost;
        }

        orderTemplate.selledProducts = addBulkSelledProduct;
        orderTemplate.totalCost = generalTotalCost;

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        listRecords.unshift({
            action: "PRODUCT_ADDED",
            title: getTitleOrderRecord("PRODUCT_ADDED"),
            details: listProductsToRecord.join(";"),
            madeById: user.id,
            createdAt: new Date(),
            isPublic: true,
        });

        //Checking stability of products
        if (dispatch.products.length === 0) {
            t.rollback();
            return res.status(400).json({
                message: `Se ha recibido la orden sin productos. Por favor, vuelva a intentarlo.`,
            });
        }

        if (dispatch.products.length !== orderTemplate.selledProducts.length) {
            t.rollback();
            return res.status(400).json({
                message: `Todos los productos de la orden no fueron encontrados. Por favor, revise su orden y vuelva a intentarlo.`,
            });
        }

        const result_totals = await calculateOrderTotalV2(
            orderTemplate.businessId,
            t
        );

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newBillingOrder/calculateOrderTotalV2",
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: user.businessId,
                    userId: user.id,
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        let lastOperationNumber: number = await OrderReceipt.max(
            "operationNumber",
            {
                where: {
                    businessId: user.businessId,
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

        orderTemplate = await getOrderFromCacheTransaction(
            user.businessId,
            tId
        );
        orderTemplate.operationNumber = lastOperationNumber;

        const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
            include: [
                OrderReceiptPrice,
                OrderReceiptTotal,
                {
                    model: SelledProduct,
                    include: [
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                        { model: Price, as: "baseUnitaryPrice" },
                    ],
                },
                OrderReceiptModifier,
            ],
        });

        //Associating order to dispatch
        order.dispatchId = dispatch.id;
        await order.save({ transaction: t });

        dispatch.status = "BILLED";
        await dispatch.save({ transaction: t });

        //Preparing data to return
        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            { transaction: t }
        );

        await t.commit();

        res.status(200).json(to_return);

        if (listRecords.length !== 0) {
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
        }

        //Checking products
        if (dispatch.products.length !== 0) {
            productQueue.add(
                {
                    code: "CHECKING_PRODUCT",
                    params: {
                        productsIds: dispatch.products.map(
                            item => item.productId
                        ),
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const registerAPayment = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    //@ts-ignore
    const tId = t.id;

    try {
        const { id } = req.params;
        const {
            coupons,
            registeredPayments,
            amountReturned,
            isPartialPay,
            prepaidPaymentIds,
            areaId,
            ...params
        } = req.body;
        const user: User = req.user;
        const business: Business = req.business;

        console.log("=====");
        console.log({
            coupons,
            registeredPayments,
            amountReturned,
            isPartialPay,
            prepaidPaymentIds,
            areaId,
            ...params,
        });
        console.log("=====");

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
                businessId: user.businessId,
            },
            include: [
                CurrencyPayment,
                CashRegisterOperation,
                OrderReceiptPrice,
                OrderReceiptTotal,
                OrderReceiptModifier,
                {
                    model: SelledProduct,
                    required: false,
                    include: [{ model: Price, as: "priceUnitary" }],
                },
                PartialPayment,
                {
                    model: Price,
                    as: "shippingPrice",
                },
                { model: Price, as: "amountReturned" },
                { model: Price, as: "couponDiscountPrice" },
                { model: Price, as: "tipPrice" },
                {
                    model: Coupon,
                    through: {
                        attributes: [],
                    },
                },
            ],
            transaction: t,
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `La orden no fue encontrada.`,
            });
        }

        // --> LOCK ORDER
        await OrderReceipt.findByPk(order.id, {
            lock: true,
            transaction: t,
        });
        // --> LOCK ORDER

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(order.toJSON()),
            {
                EX: getExpirationTime("order"),
            }
        );

        if (order.status === "BILLED") {
            t.rollback();
            return res.status(400).json({
                message: `Esta orden ya ha sido pagada. Acción no permitida.`,
            });
        } else if (order.status === "REFUNDED") {
            t.rollback();
            return res.status(400).json({
                message: `Esta orden ya ha sido rembolsada. Acción no permitida.`,
            });
        } else if (order.status === "CANCELLED") {
            t.rollback();
            return res.status(400).json({
                message: `Esta orden ha sido cancelada. Acción no permitida.`,
            });
        }

        if (order.isPreReceipt) {
            t.rollback();
            return res.status(400).json({
                message: `Solo se puede registrar pagos de facturas por favor trasforme la orden a este estado.`,
            });
        }

        const availableCurrencies = await getCurrenciesCache(user.businessId);
        const main_currency = availableCurrencies.find(item => item.isMain);
        if (!main_currency) {
            t.rollback();
            return res.status(400).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        const areaRegisterPay = await getAreaCache(areaId);

        if (!areaRegisterPay) {
            t.rollback();
            return res.status(400).json({
                message: `No se ha encontrado el área proporcionada.`,
            });
        }

        if (areaRegisterPay.type !== "SALE") {
            t.rollback();
            return res.status(400).json({
                message: `El area definida no es un punto de venta.`,
            });
        }

        //General control var
        let listBulkOrderReceipt: Array<Partial<OrderReceiptRecord>> = [];
        let bulkOperations: Array<Partial<CashRegisterOperation>> = [];
        let addBulkCurrencies: Partial<
            PartialPayment | CurrencyPayment | any
        >[] = [];
        const allowedPaymentWays = [
            "CASH",
            "TRANSFER",
            "CARD",
            "CREDIT_POINTS",
        ];
        //Local object data
        let orderTemplate: any = {};
        let totalToPay: Array<SimplePrice> = [];
        let realPayReceived: Array<SimplePrice> = [];

        //Checking if prepaidPayments are received
        let bulkPrepaidPayment: Array<{
            id: number;
            orderReceiptId: number;
            status: string;
        }> = [];
        let prepaidPayments = [];

        if (prepaidPaymentIds) {
            const allPrepaidPayments = await PrepaidPayment.findAll({
                where: {
                    id: prepaidPaymentIds,
                    businessId: user.businessId,
                },
            });

            for (const prepaidId of prepaidPaymentIds) {
                const found = allPrepaidPayments.find(
                    item => item.id === prepaidId
                );

                if (!found) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El pago anticipado con id ${prepaidId} no fue encontrado.`,
                    });
                }

                bulkPrepaidPayment.push({
                    id: prepaidId,
                    orderReceiptId: order.id,
                    status: "USED",
                });

                prepaidPayments.push({
                    amount: found.amount,
                    codeCurrency: found.codeCurrency,
                    paymentWay: found.paymentWay,
                });
            }

            if (bulkPrepaidPayment.length !== 0) {
                await PrepaidPayment.bulkCreate(bulkPrepaidPayment, {
                    updateOnDuplicate: ["orderReceiptId", "status"],
                    transaction: t,
                });
            }
        }

        if (registeredPayments) {
            //Validating operation number must be unique
            const listOperationNumbers = registeredPayments.map(
                (item: any) => item.operationNumber
            );
            const cashOperations = await CashRegisterOperation.findAll({
                where: {
                    economicCycleId: economicCycle.id,
                    operationNumber: listOperationNumbers,
                },
                transaction: t,
            });

            for (const cashOperation of cashOperations) {
                t.rollback();
                return res.status(400).json({
                    message: `El número de operación ${cashOperation.operationNumber} ya está en uso. Por favor, elija otro número de operación.`,
                });
            }

            for (const payment of registeredPayments) {
                //Analyzing if paymentWay is set
                if (!allowedPaymentWays.includes(payment.paymentWay)) {
                    t.rollback();
                    return res.status(400).json({
                        message: `${payment.paymentWay} no es un tipo permitido. Campos permitidos: ${allowedPaymentWays}`,
                    });
                }

                //Registering payment
                addBulkCurrencies.push({
                    amount: payment.amount,
                    codeCurrency: payment.codeCurrency,
                    paymentWay: payment.paymentWay,
                    orderReceiptId: order.id,
                    observations: payment.observations,
                    economicCycleId: economicCycle.id,
                });

                //Registering only where it is in cash
                if (payment.paymentWay === "CASH") {
                    bulkOperations.push({
                        operation: "DEPOSIT_SALE",
                        amount: payment.amount,
                        codeCurrency: payment.codeCurrency,
                        orderReceiptId: order.id,
                        type: "debit",
                        economicCycleId: economicCycle.id,
                        areaId: areaRegisterPay.id,
                        madeById: payment.madeById ?? user.id,
                        operationNumber: payment.operationNumber,
                        observations: isPartialPay
                            ? `Pago parcial recibido a partir de la orden #${
                                  order.operationNumber
                              } del ${moment(order.registeredAt).format(
                                  "DD/MM/YYYY HH:mm"
                              )}`
                            : ``,
                    });
                }

                //For checking if the amount received is legal
                const found = realPayReceived.find(
                    item => item.codeCurrency === payment.codeCurrency
                );
                if (found) {
                    realPayReceived = realPayReceived.map(item => {
                        if (item.codeCurrency === payment.codeCurrency) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    payment.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    realPayReceived.push({
                        amount: payment.amount,
                        codeCurrency: payment.codeCurrency,
                    });
                }
            }

            if (amountReturned && areaRegisterPay.giveChangeWith) {
                t.rollback();
                return res.status(400).json({
                    message: `Lo sentimos, el área seleccionada no permite devolución de cambio en las compras.`,
                });
            }

            if (amountReturned && amountReturned.amount > 0) {
                const found = realPayReceived.find(
                    item => item.codeCurrency === amountReturned.codeCurrency
                );
                if (found) {
                    realPayReceived = realPayReceived.map(item => {
                        if (item.codeCurrency === amountReturned.codeCurrency) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    amountReturned?.amount,
                                    "subtraction",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    realPayReceived.push({
                        amount: amountReturned?.amount * -1,
                        codeCurrency: amountReturned.codeCurrency,
                    });
                }

                bulkOperations.push({
                    operation: "WITHDRAW_SALE",
                    amount: amountReturned?.amount * -1,
                    codeCurrency: amountReturned.codeCurrency,
                    orderReceiptId: order.id,
                    type: "credit",
                    economicCycleId: order.economicCycleId,
                    areaId: areaRegisterPay.id,
                    madeById: user.id,
                });

                if (order.amountReturned) {
                    order.amountReturned.amount = amountReturned.amount;
                    await order.amountReturned.save({
                        transaction: t,
                    });
                } else {
                    if (order.id) {
                        const new_price = Price.build({
                            amount: amountReturned.amount,
                            codeCurrency: amountReturned.codeCurrency,
                        });
                        await new_price.save({ transaction: t });
                        order.amountReturnedId = new_price.id;
                    }

                    //@ts-ignore
                    orderTemplate.amountReturned = {
                        amount: amountReturned.amount,
                        codeCurrency: amountReturned.codeCurrency,
                    };
                }
            }
        }

        if (isPartialPay) {
            //Analyzing if amount sent are enough for make the payment
            let amountRealReceived = 0;
            let amountRealToPay = 0;

            for (const payment of realPayReceived) {
                const realToMainCurrency = exchangeCurrency(
                    payment,
                    main_currency.currency.code,
                    availableCurrencies
                );
                if (realToMainCurrency) {
                    amountRealReceived = mathOperation(
                        amountRealReceived,
                        realToMainCurrency.amount,
                        "addition",
                        2
                    );
                }
            }

            for (const payment of order.totalToPay) {
                const toPayMainCurrency = exchangeCurrency(
                    payment,
                    main_currency.currency.code,
                    availableCurrencies
                );

                if (toPayMainCurrency) {
                    amountRealToPay = mathOperation(
                        amountRealToPay,
                        toPayMainCurrency.amount,
                        "addition",
                        2
                    );
                }
            }

            let totalPayPartial = 0;

            const totalPartial = [...order.partialPayments];
            for (const payment of totalPartial) {
                const payInMainCurrency = exchangeCurrency(
                    {
                        amount: payment.amount,
                        codeCurrency: payment.codeCurrency,
                    },
                    main_currency.currency.code,
                    availableCurrencies
                );

                if (payInMainCurrency) {
                    totalPayPartial = mathOperation(
                        payment.amount,
                        totalPayPartial,
                        "addition",
                        2
                    );
                }
            }

            //Add to parcial pays actual registered payments
            totalPayPartial = mathOperation(
                amountRealReceived,
                totalPayPartial,
                "addition",
                2
            );

            //Analyzing prepaid payments
            if (prepaidPayments.length !== 0) {
                for (const payment of prepaidPayments) {
                    const found = addBulkCurrencies.find(
                        item =>
                            item.codeCurrency === payment.codeCurrency &&
                            item.paymentWay === payment.paymentWay
                    );
                    if (found) {
                        found.amount = mathOperation(
                            found.amount || 0,
                            payment.amount,
                            "addition",
                            2
                        );
                    } else {
                        addBulkCurrencies.push({
                            amount: payment.amount,
                            codeCurrency: payment.codeCurrency,
                            paymentWay: payment.paymentWay,
                            orderReceiptId: order.id,
                            economicCycleId: economicCycle.id,
                        });
                    }

                    const payInMainCurrency = exchangeCurrency(
                        payment,
                        main_currency.currency.code,
                        availableCurrencies
                    );

                    if (payInMainCurrency) {
                        totalPayPartial = mathOperation(
                            payInMainCurrency.amount,
                            totalPayPartial,
                            "addition",
                            2
                        );
                    }
                }
            }

            if (amountRealToPay <= totalPayPartial) {
                t.rollback();
                return res.status(400).json({
                    message: `El pago parcial introducido es suficiente para pagar la orden. Por favor, factúrela completamente.`,
                });
            }

            //relation PartialPayment to CashRegisterOperation
            const createdPartialPayments = await PartialPayment.bulkCreate(
                addBulkCurrencies,
                {
                    transaction: t,
                    returning: true,
                }
            );

            bulkOperations = bulkOperations.map((operation, index) => {
                if (isPartialPay) {
                    operation.partialPaymentId =
                        createdPartialPayments[index].id;
                }
                return operation;
            });

            await CashRegisterOperation.bulkCreate(bulkOperations, {
                transaction: t,
            });

            const recordPay = realPayReceived.map(
                item => `${item?.amount}/${item?.codeCurrency}`
            );

            listBulkOrderReceipt.push({
                action: "ORDER_PARTIAL_BILLED",
                title: getTitleOrderRecord("ORDER_PARTIAL_BILLED"),
                details: `Se registró un pago parcial con el monto ${recordPay.join(
                    ", "
                )}.`,
                madeById: user.id,
                isPublic: true,
            });

            order.status = "PAYMENT_PENDING";
            await order.save({ transaction: t });

            const to_return = await OrderReceipt.scope("full_details").findByPk(
                id,
                { transaction: t }
            );

            await t.commit();

            if (order.isReservation) {
                let listRecordsReservation: Partial<ReservationRecord>[] = [];
                order?.selledProducts.forEach(item => {
                    listRecordsReservation.push({
                        action: "PAYMENT_RECEIVED",
                        title: getTitleReservationRecord("PAYMENT_RECEIVED"),
                        details: `Se registro un pago parcial de la reserva.`,
                        madeById: user.id,
                        status: order.status,
                        selledProductId: item.id,
                    });
                });
                if (listRecordsReservation.length > 0) {
                    await ReservationRecord.bulkCreate(listRecordsReservation);
                }
            }

            if (listBulkOrderReceipt.length !== 0) {
                orderQueue.add(
                    {
                        code: "REGISTER_RECORDS",
                        params: {
                            records: listBulkOrderReceipt,
                            orderId: order.id,
                        },
                    },
                    {
                        attempts: 2,
                        removeOnComplete: true,
                        removeOnFail: true,
                    }
                );
            }

            return res.status(200).json(to_return);
        }

        // ---> WHEN ORDER ARE GOING TO BE PAID

        //Destroying cupons already exist in the order
        if (order.coupons?.length !== 0) {
            await OrderReceiptCoupon.destroy({
                where: {
                    orderReceiptId: order.id,
                },
                transaction: t,
            });

            //Updating local data object
            orderTemplate.coupons = [];
        }

        if (order.couponDiscountPrice) {
            await order.couponDiscountPrice.destroy({ transaction: t });
            await order.save({ transaction: t });

            //Updating local data object
            orderTemplate.couponDiscountPrice = undefined;
        }

        //Checking and registering coupons
        if (coupons && coupons.length !== 0) {
            let normalizeProducts: Array<SimpleProductItem> = [];
            order?.selledProducts.forEach(element => {
                normalizeProducts.push({
                    productId: element.productId,
                    quantity: element.quantity,
                    variationId: element.variationId,
                });
            });

            const result_coupons = await processCoupons({
                coupons,
                listProducts: normalizeProducts,
                priceSystem: economicCycle.priceSystemId,
                businessId: user.businessId,
                userId: user?.id,
            });

            if (!internalCheckerResponse(result_coupons)) {
                t.rollback();
                Logger.error(
                    result_coupons.message ||
                        "Ha ocurrido un error inesperado.",
                    {
                        origin: "payOrder/processCoupons",
                        "X-App-Origin": req.header("X-App-Origin"),
                        businessId: user.businessId,
                        userId: user.id,
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
                            orderReceiptId: order?.id,
                            couponId: item,
                        };
                    }
                );

                await OrderReceiptCoupon.bulkCreate(listBulk, {
                    transaction: t,
                });

                //Updating local data object
                orderTemplate.coupons = listBulk;
            }

            if (result_coupons.data.couponDiscount.length !== 0) {
                //First position. In the future could be more than one
                const priceDiscount = result_coupons.data.couponDiscount[0];
                //Registering discount
                const new_price = Price.build(priceDiscount);
                await new_price.save({ transaction: t });
                order.couponDiscountPriceId = new_price.id;

                //Updating local data object
                orderTemplate.couponDiscountPrice =
                    result_coupons.data.couponDiscount[0];
            }
        }

        //Default parameters to set
        order.closedDate = new Date();
        order.paidAt = new Date();
        order.salesById = user.id;
        order.houseCosted = params.houseCosted ?? false;
        order.observations = params.observations;
        order.discount = params.discount ? Number(params.discount) : 0;
        order.commission = params.commission ? Number(params.commission) : 0;
        order.status = "BILLED";
        order.salesById = user.id;

        //Setting total cost
        const totalCost =
            order.selledProducts?.reduce(
                (total, item) => (total += item.totalCost),
                0
            ) || 0;
        order.totalCost = mathOperation(totalCost, 0, "addition", 2);

        const configurations = await getBusinessConfigCache(user.businessId);
        const cash_operations_include_tips = configurations.find(
            item => item.key === "cash_operations_include_tips"
        )?.value;

        const cash_operations_include_deliveries =
            configurations.find(
                item => item.key === "cash_operations_include_deliveries"
            )?.value === "true";

        //Checking and destroying if orderreceipt payment records exist
        if (order.currenciesPayment.length !== 0) {
            await CurrencyPayment.destroy({
                where: {
                    orderReceiptId: order.id,
                },
                transaction: t,
            });
        }

        if (order.partialPayments && order.partialPayments.length !== 0) {
            for (let pay of order.partialPayments) {
                realPayReceived.push({
                    amount: pay.amount,
                    codeCurrency: pay.codeCurrency,
                });

                //Additional with so equals
                const existCurrencyEquals = addBulkCurrencies.find(
                    item =>
                        item.codeCurrency === pay.codeCurrency &&
                        item.paymentWay === pay.paymentWay
                ) as PartialPayment;

                if (existCurrencyEquals) {
                    existCurrencyEquals.amount = mathOperation(
                        pay.amount,
                        existCurrencyEquals.amount,
                        "addition",
                        2
                    );
                } else {
                    addBulkCurrencies.push({
                        amount: pay.amount,
                        codeCurrency: pay.codeCurrency,
                        paymentWay: pay.paymentWay,
                        orderReceiptId: order.id,
                        economicCycleId: economicCycle.id,
                    });
                }
            }
        }

        //Tip price
        if (params.tipPrice) {
            if (
                cash_operations_include_tips === "true" &&
                params.tipPrice.paymentWay === "CASH"
            ) {
                bulkOperations.push({
                    operation: "DEPOSIT_TIP",
                    amount: params.tipPrice.amount,
                    codeCurrency: params.tipPrice.codeCurrency,
                    orderReceiptId: order.id,
                    type: "debit",
                    economicCycleId: economicCycle?.id,
                    areaId: areaRegisterPay.id,
                    madeById: params.salesById,
                    createdAt: params.updatedAt,
                });
            }

            if (order.tipPrice) {
                order.tipPrice.amount = params.tipPrice.amount;
                order.tipPrice.codeCurrency = params.tipPrice.codeCurrency;
                order.tipPrice.paymentWay = params.tipPrice.paymentWay;
                await order.tipPrice.save({ transaction: t });
            } else {
                const new_price = Price.build({
                    amount: params.tipPrice.amount,
                    codeCurrency: params.tipPrice.codeCurrency,
                    paymentWay: params.tipPrice.paymentWay,
                });

                await new_price.save({ transaction: t });
                order.tipPriceId = new_price.id;
            }

            //Updating local data object
            orderTemplate.tipPrice = params.tipPrice;
        }

        //Checking control tipPrice
        if (
            order.tipPrice &&
            params?.tipPrice &&
            params?.tipPrice.amount === 0
        ) {
            await order.tipPrice.destroy({ transaction: t });
        }

        //Checking shippingPrice
        if (params.shippingPrice) {
            if (order.shippingPrice) {
                order.shippingPrice.amount = params.shippingPrice.amount;
                order.shippingPrice.codeCurrency =
                    params.shippingPrice.codeCurrency;
                order.shippingPrice.paymentWay =
                    params.shippingPrice.paymentWay;
                await order.shippingPrice.save({ transaction: t });
            } else {
                const new_price = Price.build({
                    amount: params.shippingPrice.amount,
                    codeCurrency: params.shippingPrice.codeCurrency,
                    paymentWay: params.shippingPrice.paymentWay,
                });
                await new_price.save({ transaction: t });
                order.shippingPriceId = new_price.id;
            }

            if (!cash_operations_include_deliveries) {
                bulkOperations.push({
                    operation: "WITHDRAW_SHIPPING_PRICE",
                    amount: params.shippingPrice.amount * -1,
                    codeCurrency: params.shippingPrice.codeCurrency,
                    orderReceiptId: order.id,
                    type: "credit",
                    economicCycleId: economicCycle?.id,
                    areaId: order.areaSalesId,
                    madeById: params.salesById,
                    createdAt: params.updatedAt,
                });
            }

            //Updating local data object
            orderTemplate.shippingPrice = params.shippingPrice;
        } else {
            await order.shippingPrice?.destroy({
                transaction: t,
            });

            //updating local data object
            orderTemplate.shippingPrice = undefined;
        }

        await order.save({ transaction: t });

        let updatedObjectOrder = {
            ...order.dataValues,
            ...orderTemplate,
        };

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(updatedObjectOrder),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Setting totals - At the end of pos in order to include the shippingPrice
        const result_totals = await calculateOrderTotalV2(user.businessId, t);

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "payOrder/calculateOrderTotalV2",
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: user.businessId,
                    userId: user.id,
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        totalToPay = result_totals.data.totalToPay;

        //Checking if total received is enough
        let amountRealReceived = 0;
        let amountRealToPay = 0;

        for (const payment of realPayReceived) {
            const realToMainCurrency = exchangeCurrency(
                payment,
                main_currency.currency.code,
                availableCurrencies
            );
            const p = availableCurrencies.find(
                ite => ite.currency.code === payment.codeCurrency
            );

            if (realToMainCurrency) {
                amountRealReceived = mathOperation(
                    amountRealReceived,
                    realToMainCurrency.amount,
                    "addition",
                    2
                );
            }
        }

        //Analyzing prepaid payments
        if (prepaidPayments.length !== 0) {
            for (const payment of prepaidPayments) {
                const found = addBulkCurrencies.find(
                    item =>
                        item.codeCurrency === payment.codeCurrency &&
                        item.paymentWay === payment.paymentWay
                );
                if (found) {
                    found.amount = mathOperation(
                        found.amount || 0,
                        payment.amount,
                        "addition",
                        2
                    );
                } else {
                    addBulkCurrencies.push({
                        amount: payment.amount,
                        codeCurrency: payment.codeCurrency,
                        paymentWay: payment.paymentWay,
                        orderReceiptId: order.id,
                    });
                }

                const payInMainCurrency = exchangeCurrency(
                    payment,
                    main_currency.currency.code,
                    availableCurrencies
                );

                if (payInMainCurrency) {
                    amountRealReceived = mathOperation(
                        payInMainCurrency.amount,
                        amountRealReceived,
                        "addition",
                        2
                    );
                }
            }
        }

        for (const payment of totalToPay) {
            const toPayMainCurrency = exchangeCurrency(
                payment,
                main_currency.currency.code,
                availableCurrencies
            );

            if (toPayMainCurrency) {
                amountRealToPay = mathOperation(
                    amountRealToPay,
                    toPayMainCurrency.amount,
                    "addition",
                    2
                );
            }
        }
        console.log(amountRealReceived);
        console.log(amountRealToPay);
        if (areaRegisterPay.giveChangeWith) {
            if (amountRealReceived < amountRealToPay) {
                t.rollback();
                Logger.error(
                    `El monto enviado no es suficiente. Por favor, actualice su estación de trabajo y vuelva a intentarlo.`,
                    {
                        origin: "payOrder",
                        "X-App-Origin": req.header("X-App-Origin"),
                        businessId: user.businessId,
                        userId: user.id,
                        amountRealReceived,
                        amountRealToPay,
                    }
                );
                return res.status(400).json({
                    message: `El monto enviado no es suficiente. Por favor, actualice su estación de trabajo y vuelva a intentarlo.`,
                });
            }
        } else {
            if (amountRealToPay > amountRealReceived) {
                t.rollback();
                Logger.error(
                    `El monto enviado sobrepasa la orden. Por favor, actualice su estación de trabajo y vuelva a intentarlo.`,
                    {
                        origin: "payOrder",
                        "X-App-Origin": req.header("X-App-Origin"),
                        businessId: user.businessId,
                        userId: user.id,
                        amountRealReceived,
                        amountRealToPay,
                    }
                );
                return res.status(400).json({
                    message: `El monto enviado sobrepasa la orden. Por favor, actualice su estación de trabajo y vuelva a intentarlo.`,
                });
            }
        }

        //Setting final data
        if (addBulkCurrencies.length !== 0) {
            await CurrencyPayment.bulkCreate(addBulkCurrencies, {
                transaction: t,
            });
        }

        const addFinalPay: Partial<PartialPayment>[] = [];
        for (const payment of registeredPayments) {
            //Analyzing if paymentWay is set
            if (!allowedPaymentWays.includes(payment.paymentWay)) {
                t.rollback();
                return res.status(400).json({
                    message: `${payment.paymentWay} no es un tipo permitido. Campos permitidos: ${allowedPaymentWays}`,
                });
            }

            //Registering payment
            addFinalPay.push({
                amount: payment.amount,
                codeCurrency: payment.codeCurrency,
                paymentWay: payment.paymentWay,
                orderReceiptId: order.id,
                observations: payment.observations,
            });
        }

        if (addFinalPay.length !== 0) {
            await PartialPayment.bulkCreate(addFinalPay, {
                transaction: t,
            });
        }

        if (bulkOperations.length !== 0) {
            await CashRegisterOperation.bulkCreate(bulkOperations, {
                transaction: t,
            });
        }

        await order.save({ transaction: t });

        let detailsExtra = "";
        if (order.partialPayments.length !== 0) {
            detailsExtra = `con un total de ${order.partialPayments.length} pagos parciales.`;
        }

        listBulkOrderReceipt.push({
            action: "ORDER_BILLED",
            title: getTitleOrderRecord("ORDER_BILLED"),
            details: `La orden #${order.operationNumber} fue facturada desde administración, ${detailsExtra}`,
            madeById: user.id,
            isPublic: true,
        });

        await t.commit();

        const order_to_emit = await OrderReceipt.scope("full_details").findByPk(
            id
        );
        res.status(200).json(order_to_emit);

        if (order.isReservation) {
            let listRecordsReservation: Partial<ReservationRecord>[] = [];
            order?.selledProducts.forEach(item => {
                listRecordsReservation.push({
                    action: "RESERVATION_COMPLETED",
                    title: getTitleReservationRecord("RESERVATION_COMPLETED"),
                    details: `Se completo el pago de la reserva.`,
                    madeById: user.id,
                    status: order.status,
                    selledProductId: item.id,
                });
            });
            if (listRecordsReservation.length > 0) {
                await ReservationRecord.bulkCreate(listRecordsReservation);
            }
        }

        if (params.sendMail) {
            const emailTemplate = "NEW_ORDER_NOTIFICATION_ADMIN";
            emailQueue.add(
                {
                    code: emailTemplate,
                    params: {
                        email: order?.client?.email,
                        order_to_emit,
                        business,
                        type: "NEW_ORDEN_ADMIN",
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (listBulkOrderReceipt.length !== 0) {
            orderQueue.add(
                {
                    code: "REGISTER_RECORDS",
                    params: {
                        records: listBulkOrderReceipt,
                        orderId: order.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const refundBillingOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const { id } = req.params;
        const user: User = req.user;

        //Validations
        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const order = await OrderReceipt.findByPk(id, {
            include: [
                SelledProduct,
                OrderReceiptPrice,
                OrderReceiptTotal,
                Area,
                PartialPayment,
            ],
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `Pedido no encontrado o no disponible`,
            });
        }

        const notStatus: order_receipt_status[] = ["BILLED", "PAYMENT_PENDING"];
        if (!notStatus.includes(order.status)) {
            t.rollback();
            return res.status(400).json({
                message: `La orden no puede ser reembolsada. Solo es posible reembolsar órdenes en estado facturada o con pagos parciales registrados.`,
            });
        }

        //Checking if action belongs to user Business
        if (order.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const area = await getAreaCache(order.areaSalesId);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Área no encontrada o no disponible`,
            });
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        //Extracting cash to refund
        let bulkOperations: Partial<CashRegisterOperation>[] = [];

        // in case the order billed
        if (order.status === "BILLED") {
            for (const registerPay of order.totalToPay) {
                bulkOperations.push({
                    operation: "MANUAL_WITHDRAW",
                    amount: Math.abs(registerPay.amount) * -1,
                    codeCurrency: registerPay.codeCurrency,
                    orderReceiptId: order.id,
                    type: "credit",
                    economicCycleId: economicCycle.id,
                    areaId: order.areaSalesId,
                    madeById: user.id,
                    observations: `Reembolso creado a partir de la orden #${
                        order.operationNumber
                    } del ${moment(order.createdAt).format(
                        "DD/MM/YYYY HH:mm"
                    )}`,
                });
            }
        } else {
            // in case the order partialPayemnt and not billed
            if (order.partialPayments.length === 0) {
                t.rollback();
                return res.status(401).json({
                    message: `Esta orden no tiene ningún pago parcial que devolver.`,
                });
            }

            for (const registerPay of order.partialPayments) {
                const found = bulkOperations.find(
                    item => item.codeCurrency === registerPay.codeCurrency
                ) as SimplePrice;

                if (!found) {
                    bulkOperations.push({
                        operation: "MANUAL_WITHDRAW",
                        amount: Math.abs(registerPay.amount) * -1,
                        codeCurrency: registerPay.codeCurrency,
                        orderReceiptId: order.id,
                        type: "credit",
                        economicCycleId: economicCycle.id,
                        areaId: order.areaSalesId,
                        madeById: user.id,
                        observations: `Reembolso creado a partir de la orden #${
                            order.operationNumber
                        } del ${moment(order.createdAt).format(
                            "DD/MM/YYYY HH:mm"
                        )}.Se reembolsaron los pagos parciales.`,
                    });
                } else {
                    found.amount = mathOperation(
                        found.amount,
                        registerPay.amount,
                        "addition"
                    );
                }
            }
        }

        if (bulkOperations.length !== 0) {
            await CashRegisterOperation.bulkCreate(bulkOperations, {
                transaction: t,
            });
        }

        //Returning products to stock
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
                stockAreaId: area.stockAreaId,
                businessId: user.businessId,
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
                origin: "refundBillingOrder/restoreProductStockDisponibility",
                businessId: user.businessId,
                userId: user.id,
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        let listRecords: any = [];
        //Registering actions of old order
        listRecords.push({
            action: "ORDER_REFUNDED",
            title: getTitleOrderRecord("ORDER_REFUNDED"),
            details: `En punto de venta: ${
                order.areaSales?.name
            }. Order reembolsada de  ${moment(new Date()).format(
                "DD/MM/YYYY HH:mm"
            )} `,
            orderReceiptId: order.id,
            madeById: user.id,
        });

        await OrderReceiptRecord.bulkCreate(listRecords, { transaction: t });

        order.status = "REFUNDED";

        await order.save({ transaction: t });
        await t.commit();

        //Processing data to emit
        // Obtaining order
        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
            order.id
        );

        if (order_to_emit?.isReservation) {
            //register reservation records
            let listRecordsReservation: Partial<ReservationRecord>[] = [];
            order_to_emit?.selledProducts.forEach(item => {
                listRecordsReservation.push({
                    action: "RESERVATION_REFUNDED",
                    title: getTitleReservationRecord("RESERVATION_REFUNDED"),
                    details: `La reserva fue rembolsada.`,
                    madeById: user.id,
                    status: order.status,
                    selledProductId: item.id,
                });
            });
            if (listRecordsReservation.length > 0) {
                await ReservationRecord.bulkCreate(listRecordsReservation);
            }
        }

        res.status(200).json(order_to_emit);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const registerPrepaidPayments = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const user: User = req.user;
        const {
            registeredPayments,
            clientId,
            description,
            areaId,
            paymentDateClient,
            operationNumber,
            madeById,
        } = req.body;

        if (!clientId) {
            t.rollback();
            return res.status(400).json({
                message: `Debe proporcionar al cliente al que se va a asociar la factura .`,
            });
        }

        const client = await Client.findOne({
            where: {
                businessId: user.businessId,
                id: clientId,
            },
        });

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area no encontrada`,
            });
        }

        if (area.type !== "SALE") {
            return res.status(400).json({
                message: `El área proporcionada debe ser del tipo VENTA`,
            });
        }

        if (!client) {
            t.rollback();
            return res.status(400).json({
                message: `El cliente seleccionado no existe en su negocio.`,
            });
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );
        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        const configs = await getBusinessConfigCache(user.businessId);

        const payment_methods_enabled = configs.find(
            item => item.key === "payment_methods_enabled"
        )?.value;

        if (!payment_methods_enabled) {
            t.rollback();
            return res.status(400).json({
                message: `El negocio no tiene métodos de pagos activos .`,
            });
        }

        if (
            !payment_methods_enabled
                .split(",")
                .includes(registeredPayments.paymentWay)
        ) {
            t.rollback();
            return res.status(400).json({
                message: `El método de pago no esta disponible .`,
            });
        }

        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const currencyPaid = availableCurrencies.find(
            item => item.currency.code === registeredPayments.codeCurrency
        );

        if (!currencyPaid) {
            t.rollback();
            return {
                status: 404,
                message: `Operación no permitida. EL negocio no acepta ese tipo de moneda moneda.`,
            };
        }

        if (registeredPayments.amount <= 0) {
            t.rollback();
            return res.status(400).json({
                message: `El monto del pago no puede ser 0 o menor .`,
            });
        }

        if (operationNumber) {
            const exitOperationNumber = await CashRegisterOperation.findOne({
                where: {
                    economicCycleId: economicCycle.id,
                    operationNumber,
                },
            });

            if (exitOperationNumber) {
                t.rollback();
                return res.status(400).json({
                    message: `El número de operación ya está en uso. Por favor, elija otro número de operación.`,
                });
            }
        }

        let lastPaymentNumber: number = 1;
        let lastPaymentResult = await PrepaidPayment.max(
            "paymentNumberClient",
            {
                where: {
                    businessId: user.businessId,
                    clientId,
                },
            }
        );

        //@ts-ignore
        lastPaymentNumber = lastPaymentResult ? lastPaymentResult++ : 1;

        const extraObservations = paymentDateClient
            ? ` Fecha de pago del cliente : ${moment(paymentDateClient).format(
                  "DD/MM/YYYY"
              )}`
            : "";

        let prepaidPaymentTemplate: any = {
            paymentNumber: lastPaymentNumber,
            status: "PAID",
            amount: Number(registeredPayments.amount),
            codeCurrency: registeredPayments.codeCurrency,
            paymentWay: registeredPayments.paymentWay,
            description: `${description ?? ""}, ${extraObservations}`,
            clientId,
            businessId: user.businessId,
        };

        const prepaidPayment = PrepaidPayment.build(prepaidPaymentTemplate);

        await prepaidPayment.save({ transaction: t });

        const fullNameClient = `${client?.firstName ?? ""} ${
            client?.lastName ?? ""
        } `;

        if (madeById) {
            const madeBy = User.findOne({
                where: {
                    id: madeById,
                    businessId: user.businessId,
                },
            });

            if (!madeBy) {
                t.rollback();
                return res.status(400).json({
                    message: `El usuario que realiza el pago no existe en su negocio.`,
                });
            }
        }

        await CashRegisterOperation.create(
            {
                operation: "MANUAL_DEPOSIT",
                amount: registeredPayments.amount,
                codeCurrency: registeredPayments.codeCurrency,
                observations: `Pago anticipado #${lastPaymentNumber} de ${fullNameClient} ${extraObservations}`,
                type: "debit",
                economicCycleId: economicCycle.id,
                areaId: area.id,
                madeById: madeById ?? user.id,
                prepaidPaymentId: prepaidPayment.id,
                paymentDateClient,
                operationNumber,
            },
            { transaction: t }
        );

        await t.commit();

        const prepaidPayment_return = await PrepaidPayment.scope(
            "to_return"
        ).findByPk(prepaidPayment.id);
        return res.json(prepaidPayment_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editPrepaidPayments = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const user: User = req.user;
        const { id } = req.params;
        const { clientId, description } = req.body;

        const prepaidPayment = await PrepaidPayment.findOne({
            where: {
                id,
                businessId: user.businessId,
            },
        });

        if (!prepaidPayment) {
            t.rollback();
            return res.status(400).json({
                message: `No se encontró el pago anticipado.`,
            });
        }

        if (prepaidPayment.status !== "PAID") {
            t.rollback();
            return res.status(400).json({
                message: `No se puede modificar el pago anticipado.`,
            });
        }

        if (clientId) {
            const client = await Client.findOne({
                where: {
                    businessId: user.businessId,
                    id: clientId,
                },
            });

            if (!client) {
                t.rollback();
                return res.status(400).json({
                    message: `El cliente seleccionado no existe en su negocio.`,
                });
            }
            prepaidPayment.clientId = client.id;
        }

        if (description) prepaidPayment.description = description;

        await prepaidPayment.save({ transaction: t });
        await t.commit();

        const to_return = await PrepaidPayment.scope("to_return").findByPk(
            prepaidPayment.id
        );

        return res.json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deletedPartialPayment = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const user: User = req.user;
        const { id } = req.params;

        const partialPayment = await PartialPayment.findByPk(id);

        if (!partialPayment) {
            t.rollback();
            return res.status(400).json({
                message: `No se a encontrado el pago.`,
            });
        }

        const formatPay = `${truncateValue(partialPayment.amount)}/${partialPayment.codeCurrency
            }`;

      
        const order = await OrderReceipt.findOne({
            where: {
                id: partialPayment.orderReceiptId,
            },
        });

        if (!order) {
            t.rollback();
            return res.status(400).json({
                message: `No se a encontrado la order asociada a este pago. Contacte al administrador`,
            });
        }

        if (order.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (order.status !== "PAYMENT_PENDING") {
            t.rollback();
            return res.status(400).json({
                message: `Solo es posible eliminar pagos de órdenes pendientes a pagar.`,
            });
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        if(partialPayment.paymentWay === "CASH"){
            const cashOperationThePay = await CashRegisterOperation.findOne({
                where: {
                    partialPaymentId: partialPayment.id,
                },
            });
    
            if (!cashOperationThePay) {
                t.rollback();
                return res.status(400).json({
                    message: `No se a encontrado la operación de caja de este pago. Contacte al administrador`,
                });
            }

            if (cashOperationThePay.economicCycleId === economicCycle.id) {
                await cashOperationThePay.destroy({ transaction: t });
                await partialPayment.destroy({ transaction: t });
    
                await OrderReceiptRecord.create(
                    {
                        action: "PARTIAL_PAYMENT_REMOVED",
                        title: getTitleOrderRecord("PARTIAL_PAYMENT_REMOVED"),
                        details: `(${formatPay})`,
                        madeById: user.id,
                        createdAt: new Date(),
                        isPublic: true,
                        orderReceiptId: order.id,
                    },
                    { transaction: t }
                );

               
    
                await t.commit();
    
                const to_return = await OrderReceipt.scope("full_details").findByPk(
                    order.id
                );
    
                return res.status(200).json(to_return);
            }

            await CashRegisterOperation.create(
                {
                    operation: "WITHDRAW_SALE",
                    amount: partialPayment.amount,
                    codeCurrency: partialPayment.codeCurrency,
                    observations: `Se eliminó un pago parcial de la orden #${order.operationNumber}`,
                    type: "credit",
                    economicCycleId: economicCycle.id,
                    areaId: cashOperationThePay?.areaId ?? null,
                    madeById: user.id,
                },
                { transaction: t }
            );
        }

       

        await OrderReceiptRecord.create(
            {
                action: "PARTIAL_PAYMENT_REMOVED",
                title: getTitleOrderRecord("PARTIAL_PAYMENT_REMOVED"),
                details: `(${formatPay})`,
                madeById: user.id,
                createdAt: new Date(),
                isPublic: true,
                orderReceiptId: order.id,
            },
            { transaction: t }
        );

        await partialPayment.destroy({ transaction: t });

        await t.commit();

        const to_return = await OrderReceipt.scope("full_details").findByPk(
            order.id
        );

        return res.status(200).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const transformPreInvoiceIntoInvoice = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction(config_transactions);
    //@ts-ignore
    const tId = t.id;

    try {
        const { id } = req.params;
        const user: User = req.user;
        const { shipping, billing, pickUpInStore, paymentDeadlineAt } =
            req.body;

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
                businessId: user.businessId,
            },
            include: [
                CurrencyPayment,
                CashRegisterOperation,
                OrderReceiptPrice,
                OrderReceiptTotal,
                OrderReceiptModifier,
                {
                    model: SelledProduct,
                    required: false,
                    include: [{ model: Price, as: "priceUnitary" }],
                },
                PartialPayment,
                {
                    model: Price,
                    as: "shippingPrice",
                },
                { model: Price, as: "amountReturned" },
                { model: Price, as: "couponDiscountPrice" },
                { model: Price, as: "tipPrice" },
                {
                    model: Coupon,
                    through: {
                        attributes: [],
                    },
                },
                ShippingAddress,
            ],
            transaction: t,
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `La orden no esta disponible.`,
            });
        }

        if (!order.isPreReceipt) {
            t.rollback();
            return res.status(404).json({
                message: `Esta orden ya es una factura.`,
            });
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        const configurations = await getBusinessConfigCache(user.businessId);

        const online_shop_area_stock = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;

        const notCheckAreaSale: order_origin[] = [
            "marketplace",
            "online",
            "shop",
            "shopapk",
        ];
        const isOrderOnline = notCheckAreaSale.includes(order.origin);

        let currentArea = order.areaSalesId;
        if (isOrderOnline) {
            currentArea = Number(online_shop_area_stock);
        }

        const area = await getAreaCache(currentArea);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `No se a encontrado el area relacionada con la order`,
            });
        }

        const enable_to_sale_in_negative =
            configurations.find(
                item => item.key === "enable_to_sale_in_negative"
            )?.value === "true";

        const force_consecutive_invoice_numbers =
            configurations.find(
                item => item.key === "force_consecutive_invoice_numbers"
            )?.value === "true";

        let listRecords: any = []; //records
        let normalizeProducts: Array<ItemProductSelled> = [];

        //@ts-ignore
        order.selledProducts.forEach((element: ProductReduced) => {
            normalizeProducts.push({
                productId: element.productId,
                quantity: element.quantity,
                productionAreaId: element.productionAreaId,
                variationId: element.variationId,
                addons: element.addons,
            });
        });

        const result = await substractProductStockDisponibility(
            {
                products: normalizeProducts,
                stockAreaId: !isOrderOnline
                    ? area.stockAreaId
                    : Number(online_shop_area_stock),
                businessId: user.businessId,
                strict: !enable_to_sale_in_negative,
            },
            t
        );

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                origin: "manageProductsInOrder",
                "X-App-Origin": req.header("X-App-Origin"),
                businessId: user.businessId,
                userId: user.id,
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        order.isPreReceipt = false;
        order.status = "PAYMENT_PENDING";

        if (pickUpInStore) order.pickUpInStore = pickUpInStore;

        if (shipping) {
            const item = ShippingAddress.build({
                ...shipping,
                orderReceiptId: order.id,
            });

            await item.save({ transaction: t });
        }

        if (billing) {
            const item = BillingAddress.build({
                ...billing,
                orderReceiptId: order.id,
            });
            await item.save({ transaction: t });
        }

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(order.toJSON()),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Setting totals
        const result_totals = await calculateOrderTotalV2(user.businessId, t);

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "transformPreInvoiceIntoInvoice/calculateOrderTotalV2",
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: user.businessId,
                    userId: user.id,
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        let lastOperationNumber: number = 1;
        if (force_consecutive_invoice_numbers) {
            lastOperationNumber = await OrderReceipt.max("operationNumber", {
                where: {
                    businessId: user.businessId,
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
                    businessId: user.businessId,
                    economicCycleId: economicCycle.id,
                },
            });
        }

        if (!lastOperationNumber) {
            lastOperationNumber = 1;
        } else {
            //@ts-ignore
            lastOperationNumber += 1;
        }

        listRecords.push({
            action: "TRANSFORMED_TO_INVOICE",
            title: getTitleOrderRecord("TRANSFORMED_TO_INVOICE"),
            details: ``,
            madeById: user.id,
            createdAt: new Date(),
            isPublic: true,
        });

        order.operationNumber = lastOperationNumber;
        order.paymentDeadlineAt = paymentDeadlineAt;
        await order.save({ transaction: t });
        await t.commit();

        const order_to_emit = await OrderReceipt.scope(
            "public_return"
        ).findByPk(order.id);

        res.status(200).json(order_to_emit);

        if (listRecords.length !== 0) {
            orderQueue.add(
                {
                    code: "REGISTER_RECORDS",
                    params: {
                        records: listRecords,
                        orderId: order_to_emit?.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllPrepaidPayment = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            status,
            paymentCurrencyCode,
            dateFrom,
            dateTo,
            all_data,
            clientId,
            ...params
        } = req.query;
        const user: User = req.user;

        let where_clause: any = {};
        let order: any = [];
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

        if (params.currency) {
            where_clause["codeCurrency"] = {
                [Op.like]: params.currency,
            };
        }
        if (status) {
            where_clause["status"] = status;
        }

        if (clientId) {
            where_clause["clientId"] = clientId;
        }
        if (params.amount) {
            order.push(["amount", "DESC"]);
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_prepaidPayment = await PrepaidPayment.findAndCountAll({
            include: [
                {
                    model: Client,
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            order: [...order, ["createdAt", "DESC"]],
            limit: all_data ? undefined : limit,
            offset,
        });

        let totalPages = Math.ceil(found_prepaidPayment.count / limit);
        if (found_prepaidPayment.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_prepaidPayment.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_prepaidPayment.rows,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getPrepaidPayment = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;
        const { client, order } = req.query;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        let prepaidPayment = await PrepaidPayment.findByPk(id, {
            include: [
                {
                    model: Client,
                    attributes: ["id", "firstName", "lastName", "email"],
                },
                {
                    model: OrderReceipt,
                    attributes: [
                        "id",
                        "name",
                        "status",
                        "createdAt",
                        "operationNumber",
                        "preOperationNumber",
                        "origin",
                        "modifiedPrice",
                    ],
                },
                {
                    model: CashRegisterOperation,
                    attributes: [
                        "id",
                        "amount",
                        "codeCurrency",
                        "observations",
                        "operation",
                        "createdAt",
                    ],
                    include: [
                        {
                            model: User,
                            attributes: [
                                "id",
                                "displayName",
                                "username",
                                "email",
                            ],
                        },
                    ],
                },
            ],
        });

        if (!prepaidPayment) {
            return res.status(404).json({
                message: `Pago no encontrada`,
            });
        }

        //Permission Check
        if (prepaidPayment?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        res.status(200).json(prepaidPayment);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
export const summaryOrder = async (req: any, res: Response) => {
    try {
        const {
            dateFrom,
            dateTo,
            //Special fields
            hasCommission,
            hasDiscount,
            hasTips,
            coupons,
            isPayed,
            paymentWay,
            status,

            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "isForTakeAway",
            "managedById",
            "createdAt",
            "areaSalesId",
            "economicCycleId",
            "houseCosted",
            "discount",
            "clientId",
            "origin",
            "modifiedPrice",
            "pickUpInStore",
            "operationNumber",
            "shippingById",
            "salesById",
            "discount",
            "commission",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (params.origin) {
            const originTypes = params.origin.split(",");

            const allTypes = ["online", "woo", "pos", "admin"];

            for (const item of originTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} no es un origen permitido. Campos permitidos: ${originTypes}`,
                    });
                }
            }

            where_clause.origin = {
                [Op.or]: originTypes,
            };
        }

        if (status) {
            const statusTypes = status.split(",");

            where_clause.status = {
                [Op.or]: statusTypes,
            };
        }

        let clauseCoupons: any = {
            model: Coupon,
            attributes: ["code", "amount", "discountType"],
            through: {
                attributes: [],
            },
            paranoid: false,
        };

        if (coupons) {
            const allCoupos = coupons.split(",");
            clauseCoupons = {
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                where: {
                    code: {
                        [Op.or]: allCoupos,
                    },
                },
            };
        }

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                ),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                ),
            };
        } else {
            if (dateFrom) {
                where_clause["createdAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                };
            }

            if (dateTo) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                };
            }
        }

        //Bill from and to
        const clauseTotalPay: any = {
            model: OrderReceiptPrice,
            attributes: ["price", "codeCurrency"],
        };

        //Payment way
        const clausePaymentWay: any = {
            model: CurrencyPayment,
            attributes: ["amount", "codeCurrency", "paymentWay"],
        };

        if (paymentWay) {
            const paymentTypes = paymentWay.split(",");

            const allTypes = ["CASH", "TRANSFER"];

            for (const item of paymentTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }
            clausePaymentWay.where = {
                paymentWay: paymentTypes,
            };
        }

        const found_orders = await OrderReceipt.findAll({
            attributes: [
                "id",
                "name",
                "status",
                "discount",
                "closedDate",
                "isForTakeAway",
                "createdAt",
                "businessId",
                "operationNumber",
                "houseCosted",
                "totalCost",
                "modifiedPrice",
                "origin",
                "paidAt",
                "pickUpInStore",
                "shippingById",
                "deliveryAt",
                "commission",
                "observations",
                "clientId",
                "paymentDeadlineAt",
            ],
            where: {
                businessId: user.businessId,
            },
            include: [
                clauseTotalPay,
                clausePaymentWay,
                PartialPayment,
                {
                    model: User,
                    as: "shippingBy",
                    attributes: ["username", "displayName"],
                    paranoid: false,
                },
                {
                    model: User,
                    as: "managedBy",
                    attributes: ["username", "displayName"],
                    paranoid: false,
                },
                {
                    model: User,
                    as: "salesBy",
                    attributes: ["username", "displayName"],
                    paranoid: false,
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
                    model: Price,
                    as: "tipPrice",
                    attributes: ["amount", "codeCurrency", "paymentWay"],
                },
                {
                    model: OrderReceiptTotal,
                    attributes: ["amount", "codeCurrency"],
                },
                clauseCoupons,
                {
                    model: Client,
                    attributes: ["firstName", "lastName", "email"],
                    paranoid: false,
                },
                {
                    model: Price,
                    as: "amountReturned",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Price,
                    as: "couponDiscountPrice",
                    attributes: ["amount", "codeCurrency"],
                },
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

        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const mainCurrency = availableCurrencies.find(item => item.isMain);

        if (!mainCurrency) {
            return res.status(400).json({
                message: `No hay ninguna moneda principal definida.`,
            });
        }

        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCodeCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || mainCurrency.currency.code;

        // const summarize = ordersSummaryProcessator({
        //     orders: found_orders,
        //     mainCurrency: main_currency,
        //     availableCurrencies,
        //     costCodeCurrency: costCurrency,
        // });

        const prepaidPayments = await PrepaidPayment.findAll({
            include: [
                {
                    model: Client,
                    attributes: [],
                    where: {
                        businessId: user.businessId,
                    },
                },
            ],
        });
        moment.locale("es");
        const today = moment();
        let prepaidByStatus: any = {};
        let prepaidByMonths: any = {};

        for (let prepaid of prepaidPayments) {
            prepaidByStatus["total"] = (prepaidByStatus["total"] || 0) + 1;
            prepaidByStatus[prepaid.status] =
                (prepaidByStatus[prepaid.status] || 0) + 1;

            const prepaidMonth = moment(prepaid.createdAt).format("MMMM");
            const prepaidYear = moment(prepaid.createdAt).year();

            if (prepaidYear === today.year()) {
                if (!prepaidByMonths[prepaidMonth]) {
                    prepaidByMonths[prepaidMonth] = { total: 0 };
                }

                prepaidByMonths[prepaidMonth].total += 1;
                // switch (prepaid.status) {
                //     case "PAID":
                //         prepaidByMonths[prepaidMonth].paid += 1
                //         break;
                //     case "REFUNDED":
                //         prepaidByMonths[prepaidMonth].refunded += 1
                //         break;
                //     case "USED":
                //         prepaidByMonths[prepaidMonth].used += 1
                //         break;
                // }
            }
        }

        //======================================ORder Summary ============================================================//
        let totalSales: Array<{ amount: number; codeCurrency: string }> = [];
        let totalSalesInMainCurrency = {
            amount: 0,
            codeCurrency: mainCurrency.currency.code,
        };

        let totalCost = {
            amount: 0,
            codeCurrency: costCodeCurrency,
        };

        let totalIncomesInMainCurrency = {
            amount: 0,
            codeCurrency: mainCurrency.currency.code,
        };
        let totalIncomes: Array<{
            amount: number;
            codeCurrency: string;
        }> = [];
        let totalIncomesNotInCash: Array<{
            amount: number;
            codeCurrency: string;
            paymentWay: payments_ways;
        }> = [];
        let totalIncomesInCash: Array<{
            amount: number;
            codeCurrency: string;
        }> = [];

        let totalTips: Array<{ amount: number; codeCurrency: string }> = [];
        let totalTipsMainCurrency = {
            amount: 0,
            codeCurrency: mainCurrency.currency.code,
        };

        let totalDiscounts: Array<{ amount: number; codeCurrency: string }> =
            [];
        let totalCommissions: Array<{ amount: number; codeCurrency: string }> =
            [];
        let totalCouponsDiscounts: Array<{
            amount: number;
            codeCurrency: string;
        }> = [];
        let totalShipping: Array<{ amount: number; codeCurrency: string }> = [];
        let taxes: Array<{ amount: number; codeCurrency: string }> = [];
        let totalHouseCosted: Array<{ amount: number; codeCurrency: string }> =
            [];
        let ordersByOrigin: Record<string, number> = {};
        let ordersByPaymentWay: Record<string, number> = {
            CASH: 0,
            TRANSFER: 0,
            TROPIPAY: 0,
        };
        let ordersByClient: Record<string, any> = {};
        let topsProductOrder: Record<string, any> = {};
        let ordersByCurrency: Record<string, any> = {};
        let ordersBySeller: Record<string, any> = {};
        let orderByStatus: Record<string, any> = {};
        let orderByMonth: [] | Record<string, any> = {};
        let ordersByResumeType: Record<string, any> = {
            prepaid: prepaidPayments.length,
        };
        let ordersByResumeStatusPay: Record<string, any> = {};
        let clientsWithMostOrders: Array<{
            clientName: string;
            orderCount: number;
        }> = [];
        let clientsWithHighestSpending: Array<{
            clientName: string;
            totalSpent: number;
        }> = [];
        let topsSellers: Array<{ nameSeller: string; orderCount: number }> = [];
        let totalDiscountsInMainCurrency: Record<string, any> = {
            amount: 0,
            codeCurrency: mainCurrency.currency.code,
        };
        let salesByMonthInMainCurrency: Record<string, any> = {};
        let totalAmountBreakdown: Record<string, any> = {};
        let totalPendingForPayment = 0;
        const mainCodeCurrency = mainCurrency.currency.code;
        //Iterating all orders
        for (const order of found_orders) {
            orderByStatus["total"] = (orderByStatus["total"] || 0) + 1;
            orderByStatus[order.status] =
                (orderByStatus[order.status] || 0) + 1;

            if (order.status === "PAYMENT_PENDING") {
                ordersByResumeType["prefecture"] =
                    (ordersByResumeType["prefecture"] || 0) + 1;
            } else {
                ordersByResumeType["facture"] =
                    (ordersByResumeType["facture"] || 0) + 1;
            }

            if (order.selledProducts) {
                for (const product of order.selledProducts) {
                    if (!topsProductOrder[product.name]) {
                        topsProductOrder[product.name] = {
                            sales: 0,
                            totalValue: 0,
                        };
                    }

                    topsProductOrder[product.name].sales += 1;
                    let price = { ...product.priceUnitary };
                    let { quantity } = product;

                    if (price.codeCurrency !== mainCodeCurrency) {
                        price.amount =
                            getPriceExchanged(
                                price,
                                availableCurrencies,
                                mainCodeCurrency
                            )?.amount ?? 0;
                    }

                    topsProductOrder[product.name].totalValue = mathOperation(
                        price.amount,
                        topsProductOrder[product.name].totalValue + quantity,
                        "addition"
                    );
                }
            }

            if (order.partialPayments.length !== 0) {
                if (order.paymentDeadlineAt < new Date()) {
                    for (let pay of order.partialPayments) {
                        const found = availableCurrencies.find(
                            item => item.currency.code === pay.codeCurrency
                        );

                        if (!found) {
                            // return res.status(400).json({
                            //     message: `La moneda ${pay.codeCurrency} no está disponible en el negocio`,
                            // })
                            continue;
                        }

                        totalPendingForPayment += mathOperation(
                            pay.amount,
                            found.exchangeRate,
                            "multiplication"
                        );
                    }
                }
            }

            const orderMonths = moment(order.createdAt).format("MMMM");
            const orderYear = moment(order.createdAt).year();

            if (orderYear === today.year()) {
                if (!orderByMonth[orderMonths]) {
                    orderByMonth[orderMonths] = {
                        total: 0,
                        preBills: 0,
                        bills: 0,
                        prepaid: 0,
                    };
                }

                orderByMonth[orderMonths].total += 1;
                if (order.status === "PAYMENT_PENDING") {
                    orderByMonth[orderMonths].preBills += 1;
                } else {
                    orderByMonth[orderMonths].bills += 1;
                }

                if (!salesByMonthInMainCurrency[orderMonths]) {
                    salesByMonthInMainCurrency[orderMonths] = {
                        amount: 0,
                        codeCurrency: mainCurrency.currency.code,
                        paid: 0,
                    };
                }

                for (let pay of order.totalToPay) {
                    const found = availableCurrencies.find(
                        item => item.currency.code === pay.codeCurrency
                    );

                    if (!found) {
                        // return res.status(400).json({
                        //     message: `La moneda ${pay.codeCurrency} no está disponible en el negocio es aqui 1`,
                        // })
                        continue;
                    }

                    salesByMonthInMainCurrency[orderMonths].amount +=
                        mathOperation(
                            pay.amount,
                            found.exchangeRate,
                            "multiplication"
                        );
                }

                if (order.currenciesPayment.length === 0) {
                    //Process partial payment
                    for (let pay of order.partialPayments) {
                        const found = availableCurrencies.find(
                            item => item.currency.code === pay.codeCurrency
                        );

                        if (!found) {
                            // return res.status(400).json({
                            //     message: `La moneda ${pay.codeCurrency} no está disponible en el negocio es aqui 2`,
                            // })
                            continue;
                        }

                        salesByMonthInMainCurrency[orderMonths].paid +=
                            mathOperation(
                                pay.amount,
                                found.exchangeRate,
                                "multiplication"
                            );
                    }
                } else {
                    //Process CurrencyPayment
                    for (let pay of order.currenciesPayment) {
                        const found = availableCurrencies.find(
                            item => item.currency.code === pay.codeCurrency
                        );

                        if (!found) {
                            // return res.status(400).json({
                            //     message: `La moneda ${pay.codeCurrency} no está disponible en el negocio es aqui 3`,
                            // })
                            continue;
                        }

                        salesByMonthInMainCurrency[orderMonths].paid +=
                            mathOperation(
                                pay.amount,
                                found.exchangeRate,
                                "multiplication"
                            );

                        if (
                            order.amountReturned &&
                            order.amountReturned.codeCurrency ===
                                mainCodeCurrency
                        ) {
                            salesByMonthInMainCurrency[orderMonths].paid =
                                mathOperation(
                                    salesByMonthInMainCurrency[orderMonths]
                                        .paid,
                                    order.amountReturned.amount,
                                    "subtraction"
                                );
                        }
                    }
                }
            }

            //Analyzing payments in order
            for (const payment of order.currenciesPayment) {
                //TotalIncomes not in Cash
                if (payment.paymentWay !== "CASH") {
                    const found_total_not_cash = totalIncomesNotInCash.find(
                        item =>
                            item.codeCurrency === payment.codeCurrency &&
                            item.paymentWay === payment.paymentWay
                    );

                    if (found_total_not_cash) {
                        totalIncomesNotInCash = totalIncomesNotInCash.map(
                            item => {
                                if (
                                    item.codeCurrency ===
                                        payment.codeCurrency &&
                                    item.paymentWay === payment.paymentWay
                                ) {
                                    return {
                                        ...item,
                                        amount: item.amount + payment.amount,
                                    };
                                }
                                return item;
                            }
                        );
                    } else {
                        totalIncomesNotInCash = [
                            ...totalIncomesNotInCash,
                            {
                                amount: payment.amount,
                                codeCurrency: payment.codeCurrency,
                                paymentWay: payment.paymentWay,
                            },
                        ];
                    }
                }
            }

            //Obtaining incomes
            if (!order.houseCosted) {
                for (const total of order.totalToPay) {
                    const foundIndex = totalIncomes.findIndex(
                        item => item.codeCurrency === total.codeCurrency
                    );

                    if (foundIndex !== -1) {
                        totalIncomes[foundIndex].amount = mathOperation(
                            totalIncomes[foundIndex].amount,
                            total.amount,
                            "addition",
                            2
                        );
                    } else {
                        totalIncomes.push({
                            amount: total.amount,
                            codeCurrency: total.codeCurrency,
                        });
                    }
                }
            }

            //Taxes
            if (order.taxes) {
                const found_taxes = taxes.find(
                    tax => tax.codeCurrency === order.taxes?.codeCurrency
                );

                if (found_taxes) {
                    taxes = taxes.map(tax => {
                        if (tax.codeCurrency === order.taxes?.codeCurrency) {
                            return {
                                ...tax,
                                amount: tax.amount + order.taxes?.amount,
                            };
                        }
                        return tax;
                    });
                } else {
                    taxes.push({
                        amount: order.taxes?.amount,
                        codeCurrency: order.taxes?.codeCurrency,
                    });
                }
            }

            //Cost of order
            totalCost.amount += order.totalCost;

            //Analyzing prices
            for (const price of order.prices) {
                //Total Sales
                if (!order.houseCosted) {
                    const found_price = totalSales.find(
                        sale => sale.codeCurrency === price.codeCurrency
                    );

                    if (found_price) {
                        totalSales = totalSales.map(sale => {
                            if (sale.codeCurrency === price.codeCurrency) {
                                return {
                                    ...sale,
                                    amount: sale.amount + price.price,
                                };
                            }
                            return sale;
                        });
                    } else {
                        totalSales.push({
                            amount: price.price,
                            codeCurrency: price.codeCurrency,
                        });
                    }
                }

                //Total discounts
                if (order.discount !== 0 && order.discount) {
                    const amountDiscounted = mathOperation(
                        price.price,
                        order.discount / 100,
                        "multiplication",
                        2
                    );

                    const found_discount = totalDiscounts.find(
                        discount => discount.codeCurrency === price.codeCurrency
                    );

                    if (found_discount) {
                        totalDiscounts = totalDiscounts.map(discount => {
                            if (discount.codeCurrency === price.codeCurrency) {
                                return {
                                    ...discount,
                                    amount: discount.amount + amountDiscounted,
                                };
                            }
                            return discount;
                        });
                    } else {
                        totalDiscounts.push({
                            amount: amountDiscounted,
                            codeCurrency: price.codeCurrency,
                        });
                    }
                }

                //Total commissions
                if (order.commission !== 0 && order.commission) {
                    const amountAdded = mathOperation(
                        price.price,
                        order.commission / 100,
                        "multiplication",
                        2
                    );

                    const found_commission = totalCommissions.find(
                        commission =>
                            commission.codeCurrency === price.codeCurrency
                    );

                    if (found_commission) {
                        totalCommissions = totalCommissions.map(commission => {
                            if (
                                commission.codeCurrency === price.codeCurrency
                            ) {
                                return {
                                    ...commission,
                                    amount: commission.amount + amountAdded,
                                };
                            }
                            return commission;
                        });
                    } else {
                        totalCommissions.push({
                            amount: amountAdded,
                            codeCurrency: price.codeCurrency,
                        });
                    }
                }
            }

            //Including taxes to TotalSales
            if (taxes.length !== 0) {
                for (const tax of taxes) {
                    const found_price = totalSales.find(
                        sale => sale.codeCurrency === tax.codeCurrency
                    );

                    if (found_price) {
                        totalSales = totalSales.map(sale => {
                            if (sale.codeCurrency === tax.codeCurrency) {
                                return {
                                    ...sale,
                                    amount: sale.amount + tax.amount,
                                };
                            }
                            return sale;
                        });
                    } else {
                        totalSales.push({
                            amount: tax.amount,
                            codeCurrency: tax.codeCurrency,
                        });
                    }
                }
            }

            //Total house costed
            if (order.houseCosted) {
                const found_house_costed = totalHouseCosted.find(
                    item => item.codeCurrency === mainCurrency.currency.code
                );

                if (found_house_costed) {
                    totalHouseCosted = totalHouseCosted.map(item => {
                        if (item.codeCurrency === mainCurrency.currency.code) {
                            return {
                                ...item,
                                amount: item.amount + order.totalCost,
                            };
                        }
                        return item;
                    });
                } else {
                    totalHouseCosted.push({
                        amount: order.totalCost,
                        codeCurrency: mainCurrency.currency.code,
                    });
                }
            }

            //If tips
            if (order.tipPrice) {
                const found_tip = totalTips.find(
                    tip => tip.codeCurrency === order.tipPrice?.codeCurrency
                );
                if (found_tip) {
                    totalTips = totalTips.map(tip => {
                        if (tip.codeCurrency === order.tipPrice?.codeCurrency) {
                            return {
                                ...tip,
                                amount: tip.amount + order.tipPrice.amount,
                            };
                        }
                        return tip;
                    });
                } else {
                    totalTips.push({
                        amount: order.tipPrice.amount,
                        codeCurrency: order.tipPrice.codeCurrency,
                    });
                }
            }

            //Shipping prices
            if (order.shippingPrice) {
                const found_shipping = totalShipping.find(
                    shipping =>
                        shipping.codeCurrency ===
                        order.shippingPrice?.codeCurrency
                );

                if (found_shipping) {
                    totalShipping = totalShipping.map(shipping => {
                        if (
                            shipping.codeCurrency ===
                            order.shippingPrice?.codeCurrency
                        ) {
                            return {
                                ...shipping,
                                amount:
                                    shipping.amount +
                                    order.shippingPrice?.amount,
                            };
                        }
                        return shipping;
                    });
                } else {
                    totalShipping.push({
                        amount: order.shippingPrice.amount,
                        codeCurrency: order.shippingPrice.codeCurrency,
                    });
                }
            }

            //Coupon discount
            if (order.couponDiscountPrice) {
                const found = totalCouponsDiscounts.find(
                    discount =>
                        discount.codeCurrency ===
                        order.couponDiscountPrice?.codeCurrency
                );

                if (found) {
                    totalCouponsDiscounts = totalCouponsDiscounts.map(
                        discount => {
                            if (
                                discount.codeCurrency ===
                                order.couponDiscountPrice?.codeCurrency
                            ) {
                                return {
                                    ...discount,
                                    amount: mathOperation(
                                        discount.amount,
                                        order.couponDiscountPrice.amount,
                                        "addition",
                                        2
                                    ),
                                };
                            }

                            return discount;
                        }
                    );
                } else {
                    totalCouponsDiscounts.push({
                        amount: order.couponDiscountPrice.amount,
                        codeCurrency: order.couponDiscountPrice.codeCurrency,
                    });
                }

                //Adding to discount as general
                const found2 = totalDiscounts.find(
                    discount =>
                        discount.codeCurrency ===
                        order.couponDiscountPrice?.codeCurrency
                );

                if (found2) {
                    totalDiscounts = totalDiscounts.map(discount => {
                        if (
                            discount.codeCurrency ===
                            order.couponDiscountPrice?.codeCurrency
                        ) {
                            return {
                                ...discount,
                                amount: mathOperation(
                                    discount.amount,
                                    order.couponDiscountPrice.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }

                        return discount;
                    });
                } else {
                    totalDiscounts.push({
                        amount: order.couponDiscountPrice.amount,
                        codeCurrency: order.couponDiscountPrice.codeCurrency,
                    });
                }
            }

            //Total order by origin
            if (order.origin) {
                ordersByOrigin["total"] = (ordersByOrigin["total"] || 0) + 1;
                ordersByOrigin[order.origin] =
                    (ordersByOrigin[order.origin] || 0) + 1;
            }

            //Total order by paymentWay
            for (const payment of order.currenciesPayment) {
                if (payment.paymentWay) {
                    ordersByPaymentWay["total"] =
                        (ordersByPaymentWay["total"] || 0) + 1;
                    ordersByPaymentWay[payment.paymentWay] =
                        (ordersByPaymentWay[payment.paymentWay] || 0) + 1;
                }
            }

            //Total order and totalToPay in mainCurrency
            if (order.client) {
                const clientId = order.clientId;
                const clientName = `${order.client.firstName} ${order.client.lastName}`;

                if (!ordersByClient[clientId]) {
                    ordersByClient[clientId] = {
                        nameClient: clientName,
                        totalOrder: 0,
                        totalPayInOrden: 0,
                    };
                }

                ordersByClient[clientId].totalOrder++;

                order.totalToPay.forEach(price => {
                    let amount = price.amount;
                    //There are orders where the client is null #Todo
                    ordersByCurrency[price.codeCurrency] =
                        (ordersByCurrency[price.codeCurrency] || 0) + 1;

                    if (price.codeCurrency !== mainCodeCurrency) {
                        amount =
                            getPriceExchanged(
                                price,
                                availableCurrencies,
                                mainCodeCurrency
                            )?.amount ?? 0;
                    }

                    ordersByClient[clientId].totalPayInOrden = mathOperation(
                        amount,
                        ordersByClient[clientId].totalPayInOrden,
                        "addition"
                    );
                });
            }

            if (order.salesBy) {
                const salesById = order.salesById;
                const sellerName = `${order.salesBy.username}-${order.salesBy.displayName}`;

                if (!ordersBySeller[salesById]) {
                    ordersBySeller[salesById] = {
                        nameSeller: sellerName,
                        totalOrder: 0,
                        totalPayInOrden: 0,
                    };
                }

                ordersBySeller[salesById].totalOrder++;

                order.totalToPay.forEach(price => {
                    let amount = price.amount;

                    if (price.codeCurrency !== mainCodeCurrency) {
                        amount =
                            getPriceExchanged(
                                price,
                                availableCurrencies,
                                mainCodeCurrency
                            )?.amount ?? 0;
                    }

                    ordersBySeller[salesById].totalPayInOrden = mathOperation(
                        amount,
                        ordersBySeller[salesById].totalPayInOrden,
                        "addition"
                    );
                });
            }
        }

        //Calculating totalIncomes in cash
        for (const total of totalIncomes) {
            const foundIndex = totalIncomesNotInCash.findIndex(
                item => item.codeCurrency === total.codeCurrency
            );

            let inCash = total.amount;
            if (foundIndex !== -1) {
                inCash = mathOperation(
                    total.amount,
                    totalIncomesNotInCash[foundIndex].amount,
                    "subtraction",
                    2
                );
            }

            const foundTotalInCashIndex = totalIncomesInCash.findIndex(
                item => item.codeCurrency === total.codeCurrency
            );
            if (foundTotalInCashIndex !== -1) {
                totalIncomesInCash[foundTotalInCashIndex].amount =
                    mathOperation(
                        inCash,
                        totalIncomesInCash[foundTotalInCashIndex].amount,
                        "addition",
                        2
                    );
            } else {
                totalIncomesInCash.push({
                    amount: inCash,
                    codeCurrency: total.codeCurrency,
                });
            }
        }

        //TotalSales in Main currency
        for (let sales of totalSales) {
            const found = availableCurrencies.find(
                item => item.currency.code === sales.codeCurrency
            );

            if (!found) {
                // return res.status(400).json({
                //     message: `La moneda ${sales.codeCurrency} no está disponible en el negocio`,
                // })
                continue;
            }

            totalSalesInMainCurrency.amount += mathOperation(
                sales.amount,
                found.exchangeRate,
                "multiplication"
            );
        }

        //totalDiscounts in Main currency
        for (let discount of totalDiscounts) {
            const found = availableCurrencies.find(
                item => item.currency.code === discount.codeCurrency
            );

            if (!found) {
                // return res.status(400).json({
                //     message: `La moneda ${discount.codeCurrency} no está disponible en el negocio`,
                // })
                continue;
            }

            totalDiscountsInMainCurrency.amount += mathOperation(
                discount.amount,
                found.exchangeRate,
                "multiplication"
            );
        }

        //Total tips in Main Currency
        for (let tip of totalTips) {
            const found = availableCurrencies.find(
                item => item.currency.code === tip.codeCurrency
            );

            if (!found) {
                // return res.status(400).json({
                //     message: `La moneda ${tip.codeCurrency} no está disponible en el negocio`,
                // })
                continue;
            }

            totalTipsMainCurrency.amount += mathOperation(
                tip.amount,
                found.exchangeRate,
                "multiplication"
            );
        }

        //TotalIncomes in Main currency
        for (let income of totalIncomes) {
            const found = availableCurrencies.find(
                item => item.currency.code === income.codeCurrency
            );

            if (!found) {
                // return res.status(400).json({
                //     message: `La moneda ${income.codeCurrency} no está disponible en el negocio`,
                // })
                continue;
            }

            totalIncomesInMainCurrency.amount += mathOperation(
                income.amount,
                found.exchangeRate,
                "multiplication"
            );
        }

        // Gross revenue in sales
        //Transform sales in currency of cost
        const incomesInCostCurrency = exchangeCurrency(
            {
                amount: totalSalesInMainCurrency.amount,
                codeCurrency: mainCurrency.currency.code,
            },
            costCodeCurrency,
            availableCurrencies
        );

        const totalGrossRevenue = {
            amount: mathOperation(
                incomesInCostCurrency?.amount || 0,
                totalCost.amount,
                "subtraction"
            ),
            codeCurrency: costCodeCurrency,
        };

        //Convert to arrays
        //Top 10 order
        topsSellers = Object.entries(ordersBySeller).map(
            ([_, { nameSeller, totalOrder, totalPayInOrden }]) => ({
                nameSeller,
                orderCount: totalOrder,
                totalPayInOrden,
            })
        );

        topsSellers.sort((a: any, b: any) => b.totalOrder - a.totalOrder);

        topsSellers = topsSellers.slice(0, 3);

        orderByMonth = Object.entries(orderByMonth).map(([month, data]) => {
            return {
                month,
                total: data.total,
                preBills: data.preBills,
                bills: data.bills,
                prepaid: data.prepaid,
            };
        });

        //Top 3 order
        ordersByClient = Object.entries(ordersByClient).map(
            ([_, { nameClient, totalOrder, totalPayInOrden }]) => ({
                nameClient,
                totalOrder,
                totalPayInOrden,
            })
        );

        ordersByClient.sort((a: any, b: any) => b.totalOrder - a.totalOrder);

        ordersByClient = ordersByClient.slice(0, 3);

        //Top 10 order
        topsProductOrder = Object.keys(topsProductOrder).map(product => {
            return {
                product,
                sales: topsProductOrder[product].sales,
                totalValue: topsProductOrder[product].totalValue,
            };
        });

        topsProductOrder.sort((a: any, b: any) => b.sales - a.sales);

        topsProductOrder = topsProductOrder.slice(0, 10);

        ordersByCurrency = Object.entries(ordersByCurrency).map(
            ([currency, total]) => {
                return {
                    currency,
                    total,
                };
            }
        );

        salesByMonthInMainCurrency = Object.entries(
            salesByMonthInMainCurrency
        ).map(([month, data]) => {
            return {
                month,
                amount: data.amount,
                codeCurrency: data.codeCurrency,
            };
        });

        prepaidByMonths = Object.entries(prepaidByMonths).map(
            ([month, data]) => {
                return {
                    month,
                    //@ts-ignore
                    total: data.total,
                };
            }
        );

        for (let data of orderByMonth as any[]) {
            const month = data.month;

            const prepaid = prepaidByMonths.find(
                (item: any) => item.month === month
            );

            if (prepaid) {
                data.prepaid = prepaid.total;
            }
        }

        totalAmountBreakdown["paid"] = {
            tips: truncateValue(totalTipsMainCurrency.amount),
            paid: truncateValue(totalSalesInMainCurrency.amount),
        };
        totalAmountBreakdown["pending"] = {
            defeated: totalPendingForPayment,
            current: truncateValue(
                totalSalesInMainCurrency.amount - totalPendingForPayment
            ),
        };
        return res.status(200).json({
            totalAmountBreakdown,
            topsProductOrder,
            topsSellers,
            ordersByResumeStatusPay,
            ordersByResumeType,
            orderByMonth,
            orderByStatus,
            ordersByClient,
            ordersByCurrency,
            totalSales,
            totalSalesInMainCurrency: {
                ...totalSalesInMainCurrency,
                amount: truncateValue(totalSalesInMainCurrency.amount, 2),
            },
            totalDiscountsInMainCurrency,

            totalTips,
            totalTipsMainCurrency,
            salesByMonthInMainCurrency,
            taxes,
            totalDiscounts,
            totalCommissions,
            totalCouponsDiscounts,
            totalShipping,
            totalHouseCosted,

            ordersByOrigin,
            //clientsWithMostOrders,
            ordersByPaymentWay,

            totalIncomes,
            totalIncomesInMainCurrency: {
                ...totalIncomesInMainCurrency,
                amount: truncateValue(totalIncomesInMainCurrency.amount, 2),
            },
            totalIncomesNotInCash: totalIncomesNotInCash.map(item => {
                return {
                    ...item,
                    amount: truncateValue(item.amount, 2),
                };
            }),
            totalIncomesInCash,

            totalCost,
            totalGrossRevenue: {
                ...totalGrossRevenue,
                amount: truncateValue(totalGrossRevenue.amount, 2),
            },
            prepaidByMonths,
            prepaidByStatus,
        });
        //======================================ORder Summary ============================================================//
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const remindCustomerPayment = async (req: any, res: Response) => {
    try {
        const user = req.user;
        const business = req.business;
        const { orderId } = req.body;

        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
            orderId
        );

        if (
            user.business !== order_to_emit?.businessId &&
            order_to_emit?.origin === "pos"
        ) {
            return res
                .status(400)
                .json({ message: "No tiene acceso a esta acción " });
        }

        if (order_to_emit?.status === "BILLED") {
            return res.status(400).json({ message: "La order ya fue pagada " });
        }

        if (!order_to_emit?.client) {
            return res
                .status(400)
                .json({ message: "La order no tiene un cliente asociado " });
        }
        if (!order_to_emit?.client.email) {
            return res.status(400).json({
                message:
                    "El cliente relacionado a la orden no tiene un correo electrónico ",
            });
        }

        const record = {
            action: "PAYMENT_REMINDER_SENT",
            title: getTitleOrderRecord("PAYMENT_REMINDER_SENT"),
            details: `Se envió un recordatoria del pago via correo electrónico.`,
            orderReceiptId: order_to_emit.id,
            madeById: user.id,
        };

        orderQueue.add(
            {
                code: "REGISTER_RECORDS",
                params: {
                    records: [record],
                    orderId: order_to_emit.id,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        const emailTemplate = "NEW_ORDER_NOTIFICATION_ADMIN";
        emailQueue.add(
            {
                code: emailTemplate,
                params: {
                    email: order_to_emit?.client?.email,
                    order_to_emit,
                    business,
                    type: "NEW_ORDEN_ADMIN",
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        // await notificationAdmin({
        //     //@ts-ignore
        //     to: order.client.email,
        //     //@ts-ignore
        //     order: order,
        //     business,
        //     type: "REMEMBER_ORDER"
        // })
        return res.json({ message: "Recordatorio enviado correctamente" });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

interface ResumeClient {
    id: number;
    cliente: string;
    totalCompletedPayments: number;
    totalPending: number;
    under30Days: number;
    between30And60Days: number;
    over60Days: number;
}
export const getOverduePayment = async (req: any, res: Response) => {
    try {
        const user = req.user;
        const { per_page, page } = req.query;

        const today = moment();
        const availableCurrency = await getCurrenciesCache(user.businessId);
        const mainCurrency = availableCurrency.find(item => item.isMain);

        if (!mainCurrency) {
            return res.status(400).json({
                message: `No hay una moneda principal definida`,
            });
        }

        let where_clause: any = {};

        where_clause["paymentDeadlineAt"] = {
            [Op.lte]: today,
        };
        where_clause["status"] = ["PAYMENT_PENDING", "OVERDUE"];

        const found_orders = await OrderReceipt.findAll({
            attributes: [
                "id",
                "status",
                "discount",
                "numberClients",
                "createdAt",
                "updatedAt",
                "businessId",
                "operationNumber",
                "totalCost",
                "origin",
                "paidAt",
                "registeredAt",
                "paymentDeadlineAt",
                "clientId",
            ],
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: PartialPayment,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: OrderReceiptTotal,
                    attributes: ["amount", "codeCurrency"],
                },
                Client,
            ],
        });

        let mappedResults: ResumeClient[] = [] as ResumeClient[];
        for (const order of found_orders) {
            const exits = mappedResults.find(
                (item: any) => item.id === order.clientId
            );

            if (!exits) {
                mappedResults.push({
                    id: order.clientId,
                    cliente: `${order?.client?.firstName ?? ""} ${
                        order?.client?.lastName ?? ""
                    }`,
                    totalPending: 0,
                    totalCompletedPayments: 0,
                    under30Days: 0,
                    between30And60Days: 0,
                    over60Days: 0,
                });
            }

            let totalPay = 0;
            let totalToPay = 0;
            for (const payment of order.totalToPay) {
                const toPayMainCurrency = exchangeCurrency(
                    payment,
                    mainCurrency.currency.code,
                    availableCurrency
                );

                if (toPayMainCurrency) {
                    totalToPay = mathOperation(
                        totalToPay,
                        toPayMainCurrency.amount,
                        "addition",
                        2
                    );
                }
            }

            for (const payment of order.partialPayments) {
                const toPayMainCurrency = exchangeCurrency(
                    payment,
                    mainCurrency.currency.code,
                    availableCurrency
                );

                if (toPayMainCurrency) {
                    totalPay = mathOperation(
                        totalPay,
                        toPayMainCurrency.amount,
                        "addition",
                        2
                    );
                }
            }

            const diffDays = getDiffDays(order.paymentDeadlineAt);

            let totalPending = 0;
            let totalCompletedPayments = 0;
            let under30Days = 0;
            let between30And60Days = 0;
            let over60Days = 0;

            if (diffDays > 0) {
                totalPending = totalToPay - totalPay;
                totalCompletedPayments = totalPay;

                if (diffDays < 30) {
                    under30Days = totalToPay - totalPay;
                } else if (diffDays < 60) {
                    between30And60Days = totalToPay - totalPay;
                } else {
                    over60Days = totalToPay - totalPay;
                }

                const resumeClient = mappedResults.find(
                    (item: any) => item.id === order.clientId
                );

                if (resumeClient) {
                    resumeClient.totalCompletedPayments =
                        mathOperation(
                            totalCompletedPayments,
                            resumeClient.totalCompletedPayments,
                            "addition"
                        ) || 0;
                    resumeClient.totalPending =
                        mathOperation(
                            totalPending,
                            resumeClient?.totalPending,
                            "addition"
                        ) || 0;

                    resumeClient.under30Days =
                        mathOperation(
                            under30Days,
                            resumeClient?.under30Days,
                            "addition"
                        ) || 0;
                    resumeClient.between30And60Days =
                        mathOperation(
                            between30And60Days,
                            resumeClient?.between30And60Days,
                            "addition"
                        ) || 0;
                    resumeClient.over60Days =
                        mathOperation(
                            over60Days,
                            resumeClient.over60Days,
                            "addition"
                        ) || 0;
                }
            }
        }

        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        let totalPages = Math.ceil(mappedResults.length / limit);
        if (mappedResults.length === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        const paginatedResults = mappedResults.slice(offset, offset + limit);

        return res.status(200).json({
            totalItems: mappedResults.length,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: paginatedResults,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

interface MappedResult {
    id: number;
    cliente: string;
    totalToPay: { currency: string; amount: number }[];
    totalPaid: { currency: string; amount: number }[];
    under30Days: { currency: string; amount: number }[];
    between30And60Days: { currency: string; amount: number }[];
    over60Days: { currency: string; amount: number }[];
}
export const getOverduePaymentV2 = async (req: any, res: Response) => {
    try {
        const user = req.user;
        const { per_page, page } = req.query;

        const today = moment();
        const availableCurrency = await getCurrenciesCache(user.businessId);

        let where_clause: any = {};

        where_clause["paymentDeadlineAt"] = {
            [Op.lte]: today,
        };
        where_clause["isPreReceipt"] = false;
        where_clause["status"] = ["OVERDUE"];

        const found_orders = await OrderReceipt.findAll({
            attributes: [
                "id",
                "status",
                "discount",
                "numberClients",
                "createdAt",
                "updatedAt",
                "businessId",
                "operationNumber",
                "totalCost",
                "origin",
                "paidAt",
                "registeredAt",
                "paymentDeadlineAt",
                "clientId",
            ],
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: PartialPayment,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: OrderReceiptTotal,
                    attributes: ["amount", "codeCurrency"],
                },
                { model: Client, paranoid: false },
            ],
        });

        // const user2 = found_orders.filter(item => item.clientId === 114)
        // res.json(user2)

        let mappedResults: any = [];
        for (const order of found_orders) {
            const exits = mappedResults.find(
                (item: any) => item.id === order.clientId
            );

            if (!exits) {
                mappedResults.push({
                    id: order.clientId,
                    cliente: `${order?.client?.firstName ?? ""} ${
                        order?.client?.lastName ?? ""
                    }`,
                    totalToPay: [],
                    totalPaid: [],
                    under30Days: [],
                    between30And60Days: [],
                    over60Days: [],
                });
            }

            for (const payment of order.totalToPay) {
                const currency = payment.codeCurrency;
                const amount = payment.amount;

                mappedResults
                    .find((item: any) => item.id === order.clientId)
                    .totalToPay.push({ currency, amount });

                const diffDays = getDiffDays(order.paymentDeadlineAt);

                switch (diffDays > 0) {
                    case diffDays < 30:
                        mappedResults
                            .find((item: any) => item.id === order.clientId)
                            .under30Days.push({ currency, amount });
                        break;
                    case diffDays >= 30 && diffDays < 60:
                        mappedResults
                            .find((item: any) => item.id === order.clientId)
                            .between30And60Days.push({ currency, amount });
                        break;
                    case diffDays > 60:
                        mappedResults
                            .find((item: any) => item.id === order.clientId)
                            .over60Days.push({ currency, amount });
                }
                //if (diffDays > 0) {
                // if ( diffDays < 30) {
                //     mappedResults.find((item: any) => item.id === order.clientId).under30Days.push({ currency, amount });
                // } else if (diffDays > 30 && diffDays < 60) {
                //     mappedResults.find((item: any) => item.id === order.clientId).between30And60Days.push({ currency, amount });
                // } else {
                //     mappedResults.find((item: any) => item.id === order.clientId).over60Days.push({ currency, amount });
                // }
                // }
            }

            for (const payment of order.partialPayments) {
                const currency = payment.codeCurrency;
                const amount = payment.amount;

                const clientSelect = mappedResults.find(
                    (item: any) => item.id === order.clientId
                ); //.totalPaid//.push({ currency, amount });
                clientSelect.totalPaid.push({ currency, amount });

                const found = clientSelect.totalToPay.find(
                    (item: any) => item.codeCurrency === currency
                );

                if (found) {
                    const toPayMainCurrency = exchangeCurrency(
                        payment,
                        found.codeCurrency,
                        availableCurrency
                    );

                    if (toPayMainCurrency) {
                        found.amount = mathOperation(
                            found.amount,
                            toPayMainCurrency.amount,
                            "subtraction",
                            2
                        );
                    }
                }
            }
        }

        for (const resume of mappedResults) {
            const totalToPay: any = {};
            const totalPaid: any = {};
            const under30Days: any = {};
            const between30And60Days: any = {};
            const over60Days: any = {};

            for (const payment of resume.totalToPay) {
                const { currency, amount } = payment;
                if (totalToPay[currency]) {
                    totalToPay[currency] += amount;
                } else {
                    totalToPay[currency] = amount;
                }
            }

            for (const payment of resume.totalPaid) {
                const { currency, amount } = payment;
                if (totalPaid[currency]) {
                    totalPaid[currency] += amount;
                } else {
                    totalPaid[currency] = amount;
                }
            }

            for (const payment of resume.under30Days) {
                const { currency, amount } = payment;
                if (under30Days[currency]) {
                    under30Days[currency] += amount;
                } else {
                    under30Days[currency] = amount;
                }
            }

            for (const payment of resume.between30And60Days) {
                const { currency, amount } = payment;
                if (between30And60Days[currency]) {
                    between30And60Days[currency] += amount;
                } else {
                    between30And60Days[currency] = amount;
                }
            }

            for (const payment of resume.over60Days) {
                const { currency, amount } = payment;
                if (over60Days[currency]) {
                    over60Days[currency] += amount;
                } else {
                    over60Days[currency] = amount;
                }
            }

            resume.totalToPay = Object.entries(totalToPay).map(
                ([codeCurrency, amount]) => ({ codeCurrency, amount })
            );
            resume.totalPaid = Object.entries(totalPaid).map(
                ([codeCurrency, amount]) => ({ codeCurrency, amount })
            );
            resume.under30Days = Object.entries(under30Days).map(
                ([codeCurrency, amount]) => ({ codeCurrency, amount })
            );
            resume.between30And60Days = Object.entries(between30And60Days).map(
                ([codeCurrency, amount]) => ({ codeCurrency, amount })
            );
            resume.over60Days = Object.entries(over60Days).map(
                ([codeCurrency, amount]) => ({ codeCurrency, amount })
            );
        }

        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        let totalPages = Math.ceil(mappedResults.length / limit);
        if (mappedResults.length === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        const paginatedResults = mappedResults.slice(offset, offset + limit);

        return res.status(200).json({
            totalItems: mappedResults.length,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: paginatedResults,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const refundPrepaidPayment = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const { id } = req.params;
        const user: User = req.user;
        const { refundInMainCurrency, areaId } = req.body;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const prepaidPayment = await PrepaidPayment.findByPk(id, {
            include: [
                {
                    model: Client,
                },
            ],
        });

        if (!prepaidPayment) {
            t.rollback();
            return res.status(404).json({
                message: `Pago anticipado no encontrado.`,
            });
        }

        if (prepaidPayment.businessId !== user.businessId) {
            t.rollback();
            return res.status(404).json({
                message: `Pago anticipado no encontrado.`,
            });
        }

        if (prepaidPayment.status !== "PAID") {
            t.rollback();
            return res.status(400).json({
                message: `Pago anticipado ya a sido usado o rembolsado operación no permitida.`,
            });
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        if (!economicCycle.isActive) {
            return res.status(404).json({
                message: `Esta pago pertenece a un ciclo económico que ya ha sido cerrado. No es posible rebosarlo`,
            });
        }

        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);
        if (!main_currency) {
            t.rollback();
            return res.status(400).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        const clientName = `${prepaidPayment?.client?.firstName ?? ""} ${
            prepaidPayment?.client.lastName ?? ""
        }`;
        let bulkOperations: Partial<CashRegisterOperation>[] = [];

        if (refundInMainCurrency) {
            let codeMainCurrency = main_currency.currency.code;
            let price: SimplePrice = {
                amount: prepaidPayment.amount,
                codeCurrency: prepaidPayment.codeCurrency,
            };

            const amountRefund = exchangeCurrency(
                price,
                codeMainCurrency,
                availableCurrencies
            );

            if (!amountRefund) {
                t.rollback();
                return res.status(400).json({
                    message: `A ocurrido un error al convertir el monto a devolver.`,
                });
            }

            bulkOperations.push({
                operation: "WITHDRAW_EXCHANGE",
                amount: Math.abs(amountRefund.amount) * -1,
                codeCurrency: amountRefund.codeCurrency,
                type: "credit",
                economicCycleId: economicCycle.id,
                madeById: user.id,
                areaId,
                observations: `Reembolso creado a partir del pago anticipado #${
                    prepaidPayment.paymentNumber
                } del ${moment(prepaidPayment.createdAt).format(
                    "DD/MM/YYYY HH:mm"
                )} del cliente : ${clientName}`,
            });
        } else {
            bulkOperations.push({
                operation: "MANUAL_WITHDRAW",
                amount: Math.abs(prepaidPayment.amount) * -1,
                codeCurrency: prepaidPayment.codeCurrency,
                type: "credit",
                economicCycleId: economicCycle.id,
                madeById: user.id,
                observations: `Reembolso creado a partir del pago anticipado #${
                    prepaidPayment.paymentNumber
                } del ${moment(prepaidPayment.createdAt).format(
                    "DD/MM/YYYY HH:mm"
                )} del cliente : ${clientName}`,
            });
        }

        prepaidPayment.status = "REFUNDED";

        prepaidPayment.save({ transaction: t });

        if (bulkOperations.length !== 0) {
            await CashRegisterOperation.bulkCreate(bulkOperations, {
                transaction: t,
            });
        }

        await t.commit();
        return res.status(200).json(prepaidPayment);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

interface ProductReduced {
    productId: number;
    price?: {
        amount: number;
        codeCurrency: string;
    };
    quantity: number;
    addons: Array<{
        id: number;
        quantity: number;
    }>;
    observations?: string;
    productionAreaId: number;
    variationId: number;
}

export const editBillingOrder = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    //@ts-ignore
    const tId = t.id;

    try {
        const origin = req.header("X-App-Origin");
        const { id } = req.params;
        const { added, deleted, ...params } = req.body;

        const user: User = req.user;
        const business: Business = req.business;
        let listRecords: any = [];

        //Validations
        const order = await OrderReceipt.findOne({
            where: {
                id,
                status: {
                    [Op.not]: ["CANCELLED", "BILLED", "REFUNDED"],
                },
            },
            include: [
                OrderReceiptModifier,
                OrderReceiptPrice,
                OrderReceiptTotal,
                {
                    model: SelledProduct,
                    include: [
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                        {
                            model: SelledProductAddon,
                            include: [Price],
                        },
                        Product,
                    ],
                },
                Area,
                ProductionTicket,
                {
                    model: Price,
                    as: "couponDiscountPrice",
                },
                {
                    model: Price,
                    as: "shippingPrice",
                },
                {
                    model: Coupon,
                    through: {
                        attributes: [],
                    },
                },
                PartialPayment,
            ],
            transaction: t,
        });

        // validations
        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `La orden no esta disponible.`,
            });
        }

        //Checking if action belongs to user Business
        if (order.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (["REFUNDED", "CANCELLED", "REFUNDED"].includes(order.status)) {
            t.rollback();
            return res.status(400).json({
                message: `La orden ha sido cerrada y no puede ser modificada.`,
            });
        }

        if (params.clientId) {
            const client = await Client.findByPk(params.clientId);

            if (!client || client.businessId !== user.businessId) {
                t.rollback();
                return res.status(401).json({
                    message: `El cliente seleccionado no existe en su negocio.`,
                });
            }
        }

        //Destroying coupons in the case it has one
        if (order.couponDiscountPrice) {
            await order.couponDiscountPrice.destroy({ transaction: t });
            const listCoupondIds = order.coupons?.map(item => item.id);
            if (order.clientId) {
                await ListUsedClientsCoupon.destroy({
                    where: {
                        clientId: order.clientId,
                        couponId: listCoupondIds,
                    },
                });
            }
            for (const coupon of order.coupons || []) {
                coupon.usageCount--;
                await coupon.save({ transaction: t });
            }
        }

        const economicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        const modelKeys = Object.keys(OrderReceipt.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "businessId",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "economicCycleId",
            "areaSaleId",
            "origin",
            "status",
            "operationNumber",
            "preOperationNumber",
        ].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `No se le permite cambiar el atributo ${att}.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }
        //Edit common Field
        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                order[att] = params[att];
            }
        });

        if (params.managedBy) {
            const managedBy = await User.findByPk(params.managedBy);

            if (!managedBy || managedBy.businessId !== user.businessId) {
                t.rollback();
                return res.status(400).json({
                    message: `El usuario seleccionado no existe en su negocio.`,
                });
            }

            order.managedById = managedBy.id;
        }

        //Precision
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const shouldGenerateProductionTickets =
            configurations.find(
                item =>
                    item.key === "generate_ticket_for_production_in_fast_orders"
            )?.value === "true";

        const enable_to_sale_in_negative =
            configurations.find(
                item => item.key === "enable_to_sale_in_negative"
            )?.value === "true";

        const online_shop_area_stock = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;

        const availableCurrencies: Array<AvailableCurrency> =
            await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);
        if (!main_currency) {
            t.rollback();
            return res.status(404).json({
                message: `No existe ninguna moneda configurada como principal. Por favor, consulte al dueño del negocio.`,
            });
        }

        await redisClient.set(
            getEphimeralTermKey(user.businessId, "order", tId),
            JSON.stringify(order),
            {
                EX: getExpirationTime("order"),
            }
        );

        const notCheckAreaSale: order_origin[] = [
            "marketplace",
            "online",
            "shop",
            "shopapk",
        ];
        const isOrderOnline = notCheckAreaSale.includes(order.origin);

        let currentArea = order.areaSalesId;
        if (isOrderOnline) {
            currentArea = Number(online_shop_area_stock);
        }

        const area = await getAreaCache(currentArea as number);

        if (!area || !area?.isActive) {
            t.rollback();
            return res.status(404).json({
                message: `Área no encontrada`,
            });
        }

        if (area?.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //===========================================================================//
        //For updating quantities
        let priceUpdates: Array<{
            id: number;
            amount: number;
        }> = [];
        let selledProductUpdatesQuantities: Array<{
            id: number;
            quantity: number;
            status: string;
            observations: string;
            totalCost: number;
        }> = [];
        let selledProductAddonUpdatesQuantities: Array<{
            id: number;
            quantity: number;
        }> = [];
        //To update via Sockets
        let productsAdded: Array<{ productId: number; quantity: number }> = [];
        let productsDeleted: Array<{ productId: number; quantity: number }> =
            [];
        //Generals
        let listTickets: Array<ProductionTicket> = [];
        let addBulkSelledProduct: Array<any> = [];
        let preparation_areas: Array<number> = [];
        let listIdsToDelete: Array<number> = [];

        //Sockets
        let toUpdateInProductionArea: Array<{
            product_selled: SelledProductV2;
            takeAction: boolean;
            areaId: number;
            productionTicketId: number;
        }> = [];

        //Cache selledProducts
        let cacheSelledProducts: Array<any> = order.selledProducts.map(
            item => item
        );

        // --> LOCK ORDER
        await OrderReceipt.findByPk(order.id, {
            lock: true,
            transaction: t,
        });
        // --> LOCK ORDER

        if (!!deleted) {
            let listProductsToRecord = [];
            const product_selled = [...deleted.products];
            //Local validations
            if (
                !product_selled &&
                (product_selled as SelledProductV2[]).length === 0
            ) {
                t.rollback();
                return res.status(406).json({
                    message: `Los productos a descontar no puede estar vacío`,
                });
            }
            let normalizeProducts: Array<ItemProductSelled> | any = [];
            for (const element of product_selled as SelledProductV2[]) {
                //Search in order the product with same id and price (amount & codeCurrency)
                const foundSelled = order.selledProducts.find(
                    item =>
                        item.productId === element.selledProductId &&
                        item.priceUnitary.codeCurrency ===
                            element.priceUnitary.codeCurrency &&
                        item.priceUnitary.amount === element.priceUnitary.amount
                );
                if (!foundSelled) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto vendido con id ${element.selledProductId} precio ${element.priceUnitary.amount}/${element.priceUnitary.codeCurrency} no fue encontrado en la orden.`,
                    });
                }

                if (element) {
                    normalizeProducts.push({
                        productId: foundSelled.productId,
                        quantity: element.quantity,
                        productionAreaId: foundSelled.productionAreaId,
                        variationId: foundSelled.variationId,
                        priceUnitary: element?.priceUnitary,
                        sellId: element?.sellId,
                    });
                }
            }

            if (!order.areaSales?.stockAreaId && !isOrderOnline) {
                t.rollback();
                return res.status(404).json({
                    message: `No se a encontrado el area de almacén del los productos a devolver`,
                });
            }

            let productsDeleted = [...normalizeProducts];
            //in case the prefacture not restore stock
            if (!order.isPreReceipt) {
                const result = await restoreProductStockDisponibility(
                    {
                        products: normalizeProducts,
                        stockAreaId:
                            area?.stockAreaId ??
                            (isOrderOnline && Number(online_shop_area_stock)),
                        businessId: user.businessId,
                        userId: user.id,
                        isAtSameEconomicCycle:
                            order.createdInActualCycle === undefined ||
                            order.createdInActualCycle,
                    },
                    t
                );

                if (!internalCheckerResponse(result)) {
                    t.rollback();
                    Logger.error(
                        result.message || "Ha ocurrido un error inesperado.",
                        {
                            origin: "manageProductsInOrder",
                            "X-App-Origin": req.header("X-App-Origin"),
                            businessId: user.businessId,
                            userId: user.id,
                        }
                    );
                    return res.status(result.status).json({
                        message: result.message,
                    });
                }

                productsDeleted = result.data.productsRemoved;
            }

            for (const deletedProduct of normalizeProducts) {
                let totalRemoved = 0;
                //Search in order the product with same id and price (amount & codeCurrency)
                const foundDeletedSelled = order.selledProducts.find(
                    item =>
                        item.productId === deletedProduct.productId &&
                        item.priceUnitary.codeCurrency ===
                            deletedProduct.priceUnitary.codeCurrency &&
                        item.priceUnitary.amount ===
                            deletedProduct.priceUnitary.amount &&
                        item.id === deletedProduct.sellId
                )!;
                if (!foundDeletedSelled) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto vendido con id ${deletedProduct.productId} precio ${deletedProduct.priceUnitary.amount}/${deletedProduct.priceUnitary.codeCurrency} no fue encontrado en la orden.`,
                    });
                }

                if (foundDeletedSelled.quantity < deletedProduct.quantity) {
                    t.rollback();
                    return res.status(406).json({
                        message: `No se puede devolver mas productos de los vendidos.`,
                    });
                }

                //Updating total to remove in order
                if (foundDeletedSelled.quantity === deletedProduct.quantity) {
                    totalRemoved = foundDeletedSelled.priceTotal.amount;
                    //Removing product
                    listIdsToDelete.push(foundDeletedSelled.id);
                } else {
                    totalRemoved = mathOperation(
                        foundDeletedSelled.priceUnitary.amount,
                        deletedProduct.quantity,
                        "multiplication",
                        2
                    );
                }
                let totalSelledCostToReduce = mathOperation(
                    foundDeletedSelled.product.averageCost,
                    deletedProduct.quantity,
                    "multiplication",
                    precission_after_coma
                );
                //For emit to update Production Area via Sockets
                if (foundDeletedSelled.productionAreaId) {
                    toUpdateInProductionArea.push({
                        product_selled: deletedProduct,
                        takeAction: false,
                        areaId: foundDeletedSelled.productionAreaId,
                        productionTicketId:
                            foundDeletedSelled.productionTicketId,
                    });
                }
                let productRemovedToRecord = [];

                //Records
                productRemovedToRecord.push(
                    `Restaurado en almacén (x${deletedProduct.quantity}) ${foundDeletedSelled?.name}`
                );

                // restore depending of the specific product type
                if (
                    ["MENU", "SERVICE", "ADDON", "COMBO"].includes(
                        foundDeletedSelled.type
                    )
                ) {
                    if (
                        foundDeletedSelled.quantity === deletedProduct.quantity
                    ) {
                        //Analyzing if product has addons and updating its quantities
                        if (
                            foundDeletedSelled.addons &&
                            foundDeletedSelled.addons?.length !== 0
                        ) {
                            let listProductWithAddonToRecord = [];
                            for (const addon of foundDeletedSelled.addons) {
                                listProductWithAddonToRecord.push(
                                    `(x${addon.quantity}) ${addon.name}`
                                );
                            }
                            productRemovedToRecord.push(
                                `${listProductWithAddonToRecord.join(",")}`
                            );
                        }
                    } else {
                        //Analyzing if addons were received
                        if (
                            deletedProduct.addons &&
                            deletedProduct.addons.length !== 0
                        ) {
                            let listProductWithAddonToRecord = [];
                            for (const addon_received of deletedProduct.addons) {
                                const addon_found =
                                    foundDeletedSelled.addons?.find(
                                        item =>
                                            item.id ===
                                            addon_received.selledProductAddonId
                                    );

                                if (!addon_found) {
                                    t.rollback();
                                    return res.status(404).json({
                                        message: `SelledAddonProduct id ${addon_received.selledProductAddonId} not found`,
                                    });
                                }

                                if (
                                    addon_found.quantity <
                                    addon_received.quantity
                                ) {
                                    t.rollback();
                                    return res.status(404).json({
                                        message: `La cantidad seleccionada de ${addon_found.name} no es válida. Cantidad posible a eliminar: ${addon_found.quantity}`,
                                    });
                                }

                                totalRemoved += mathOperation(
                                    addon_received.quantity,
                                    addon_found.priceUnitary.amount,
                                    "multiplication",
                                    2
                                );
                                listProductWithAddonToRecord.push(
                                    `(x${addon_received.quantity}) ${addon_found.name}`
                                );

                                //Calculate addon the cost
                                totalSelledCostToReduce += mathOperation(
                                    addon_found.product.averageCost,
                                    addon_received.quantity,
                                    "multiplication",
                                    precission_after_coma
                                );

                                const found_selled_quantity =
                                    selledProductAddonUpdatesQuantities.find(
                                        item => item.id === addon_found.id
                                    );
                                if (found_selled_quantity) {
                                    selledProductAddonUpdatesQuantities =
                                        selledProductAddonUpdatesQuantities.map(
                                            item => {
                                                if (
                                                    item.id === addon_found.id
                                                ) {
                                                    return {
                                                        ...item,
                                                        quantity: mathOperation(
                                                            item.quantity,
                                                            addon_received.quantity,
                                                            "subtraction",
                                                            precission_after_coma
                                                        ),
                                                    };
                                                }
                                                return item;
                                            }
                                        );
                                } else {
                                    selledProductAddonUpdatesQuantities.push({
                                        id: addon_found.id,
                                        quantity: mathOperation(
                                            addon_found.quantity,
                                            addon_received.quantity,
                                            "subtraction",
                                            precission_after_coma
                                        ),
                                    });
                                }
                            }
                            productRemovedToRecord.push(
                                `${listProductWithAddonToRecord.join(",")}`
                            );
                        }
                    }
                }

                priceUpdates.push({
                    id: foundDeletedSelled.priceTotal.id,
                    amount: foundDeletedSelled.priceTotal.amount - totalRemoved,
                });

                selledProductUpdatesQuantities.push({
                    id: foundDeletedSelled.id,
                    quantity:
                        foundDeletedSelled.quantity - deletedProduct.quantity,
                    status: foundDeletedSelled.status,
                    totalCost: mathOperation(
                        foundDeletedSelled.totalCost,
                        totalSelledCostToReduce,
                        "subtraction",
                        precission_after_coma
                    ),
                    observations: deletedProduct.observations,
                });
                listProductsToRecord.push(productRemovedToRecord);
            }

            //Registering actions
            listRecords.push({
                action: "PRODUCT_REMOVED",
                title: getTitleOrderRecord("PRODUCT_REMOVED"),
                details: listProductsToRecord.join(";"),
                madeById: user.id,
            });
        }

        if (!!added) {
            let listProductsToRecord = [];
            const areaSalesId = order.areaSalesId;
            let products = [...added.products] as ProductReduced[];

            //Local validations
            if (!areaSalesId && !isOrderOnline) {
                t.rollback();
                return res.status(406).json({
                    message: `No se recibió el identificador del area .`,
                });
            }
            const areaSale = await getAreaCache(areaSalesId);

            if (!areaSale && !isOrderOnline) {
                t.rollback();
                return res.status(404).json({
                    message: `Venta de área no encontrada`,
                });
            }

            if (!isOrderOnline && areaSale?.type !== "SALE") {
                t.rollback();
                return res.status(400).json({
                    message: `El área proporcionada no es de tipo VENTA`,
                });
            }

            //Checking if action belongs to user Business
            if (!isOrderOnline && areaSale?.businessId !== user.businessId) {
                t.rollback();
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            const enforceCurrencyArea = area?.enforceCurrency;
            const availableCodeCurrencyArea = area?.availableCodeCurrency;

            let normalizeProducts: Array<ItemProductSelled> = [];
            added.products.forEach((element: any) => {
                normalizeProducts.push({
                    productId: element.productId,
                    quantity: element.quantity,
                    productionAreaId: element.productionAreaId,
                    variationId: element.variationId,
                    addons: element.addons,
                    priceUnitary: element?.priceUnitary,
                });
            });

            let result: any = [...normalizeProducts];
            if (!order.isPreReceipt) {
                let areaStockSubstract;
                if (isOrderOnline) {
                    areaStockSubstract = online_shop_area_stock;
                } else {
                    areaStockSubstract = areaSale?.stockAreaId;
                }
                result = await substractProductStockDisponibility(
                    {
                        products: normalizeProducts,
                        stockAreaId: Number(areaStockSubstract),
                        businessId: user.businessId,
                        strict: !enable_to_sale_in_negative,
                    },
                    t
                );
                if (!internalCheckerResponse(result)) {
                    t.rollback();
                    Logger.error(
                        result.message || "Ha ocurrido un error inesperado.",
                        {
                            origin: "manageProductsInOrder",
                            "X-App-Origin": req.header("X-App-Origin"),
                            businessId: user.businessId,
                            userId: user.id,
                        }
                    );
                    return res.status(result.status).json({
                        message: result.message,
                    });
                }
            } else {
                const ids = normalizeProducts.map(item => item.productId);

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
                                    model: Supply,
                                    as: "supplies",
                                    include: [
                                        {
                                            model: Product,
                                            as: "supply",
                                            include: [StockAreaProduct],
                                        },
                                    ],
                                    required: false,
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
                            model: Supply,
                            as: "supplies",
                            include: [
                                {
                                    model: Product,
                                    as: "supply",
                                    include: [StockAreaProduct],
                                },
                            ],
                            required: false,
                        },
                        {
                            model: StockAreaProduct,
                            include: [StockAreaVariation],
                        },
                        {
                            model: Area,
                            as: "listProductionAreas",
                            attributes: ["id", "name", "stockAreaId"],
                            through: {
                                attributes: [],
                            },
                            paranoid: false,
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

                await redisClient.set(
                    getEphimeralTermKey(user.businessId, "storeProducts", tId),
                    JSON.stringify(productsFound),
                    {
                        EX: getExpirationTime("storeProducts"),
                    }
                );
            }

            //Obtaining full data from products
            const productsFound = await getStoreProductsCache(
                user.businessId,
                tId
            );

            products.forEach(item => {
                const fullProduct = productsFound.find(
                    element => element.id === item.productId
                );
                if (fullProduct) {
                    let areaId: number | undefined;
                    if (
                        fullProduct.listProductionAreas &&
                        fullProduct.listProductionAreas.length !== 0
                    ) {
                        if (fullProduct.listProductionAreas.length === 1) {
                            areaId = fullProduct.listProductionAreas[0].id;
                        } else {
                            const productReceived = products.find(
                                p => p.productId === fullProduct.id
                            )!;
                            const found = fullProduct.listProductionAreas.find(
                                a => a.id === productReceived.productionAreaId
                            );
                            if (found) {
                                areaId = found.id;
                            }
                        }
                    }
                    //Checking if area is already created
                    if (areaId && !preparation_areas.includes(areaId)) {
                        preparation_areas.push(areaId);
                    }
                }
            });

            let addBulkTickets = [];
            for (const area of preparation_areas) {
                let nextProductionNumber = 0;
                order.tickets
                    .filter(item => item.areaId === area)
                    .forEach(element => {
                        if (element.productionNumber > nextProductionNumber) {
                            nextProductionNumber = element.productionNumber;
                        }
                    });
                nextProductionNumber++;
                addBulkTickets.push({
                    status: "RECEIVED",
                    areaId: area,
                    orderReceiptId: order.id,
                    name: order.name || `#${order.operationNumber}`,
                    productionNumber: nextProductionNumber,
                });
            }

            listTickets = await ProductionTicket.bulkCreate(addBulkTickets, {
                transaction: t,
                returning: true,
            });

            for (const product of added.products as ProductReduced[] | any) {
                //Analyzing if where found
                const productDetails = productsFound.find(
                    item => item.id === product.productId
                );
                if (!productDetails) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto con id ${product.productId} no fue encontrado.`,
                    });
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
                    t.rollback();
                    return res.status(400).json({
                        message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
                    });
                }
                //Defining stockProductionAreaId
                let productionAreaId: number | undefined = !isOrderOnline
                    ? areaSale?.stockAreaId
                    : Number(online_shop_area_stock);
                if (
                    productDetails.listProductionAreas &&
                    productDetails.listProductionAreas.length !== 0
                ) {
                    if (productDetails.listProductionAreas.length === 1) {
                        productionAreaId =
                            productDetails.listProductionAreas[0].id;
                    } else {
                        const found = productDetails.listProductionAreas.find(
                            element => element.id === product.productionAreaId
                        );
                        if (found) {
                            productionAreaId = found.id;
                        }
                    }
                }
                let itemPrice: any;
                let modifiedPrice = false;
                if (product.priceUnitary) {
                    itemPrice = {
                        price: product.priceUnitary.amount,
                        codeCurrency: product.priceUnitary.codeCurrency,
                    };

                    //Searching price
                    let found = false;

                    //1. Trying to find according currency
                    const foundCommonCurrency = productDetails.prices.filter(
                        item =>
                            item.codeCurrency ===
                            product?.priceUnitary?.codeCurrency
                    );

                    if (
                        foundCommonCurrency.some(
                            item => item.price === product?.priceUnitary?.amount
                        )
                    ) {
                        found = true;
                    }

                    //2.Trying to find according exchange rate
                    if (foundCommonCurrency.length === 0) {
                        for (const price of productDetails.prices) {
                            const convertion = exchangeCurrency(
                                {
                                    amount: price.price,
                                    codeCurrency: price.codeCurrency,
                                },
                                product?.priceUnitary?.codeCurrency,
                                availableCurrencies || [],
                                3
                            );

                            //Taking into account that number must be calculate in ceil mode
                            const rounding = Number(
                                convertion?.amount.toFixed(2)
                            );

                            if (rounding === product?.priceUnitary?.amount) {
                                found = true;
                                break;
                            }
                        }
                    }

                    if (!found) {
                        modifiedPrice = true;
                        itemPrice.price = product.priceUnitary.amount;
                        itemPrice.codeCurrency =
                            product.priceUnitary.codeCurrency;
                    }
                    if (!found && !area?.allowManualPrice && !isOrderOnline) {
                        return res.status(400).json({
                            message: `El punto de venta no tiene habilitado modificar el precio del producto en una orden .`,
                        });
                    }
                } else {
                    //Obtaining price of product
                    itemPrice = obtainingProductPriceSystemPriceDefined(
                        productDetails,
                        product.variationId,
                        economicCycle.priceSystemId,
                        enforceCurrencyArea
                            ? availableCodeCurrencyArea
                            : product.priceUnitary?.codeCurrency
                    );
                }
                if (!itemPrice) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El precio del producto ${productDetails.name} no fue encontrado. Por favor consulte al propietario de negocio.`,
                    });
                }
                let totalSelledPrice = mathOperation(
                    itemPrice.price,
                    product.quantity,
                    "multiplication",
                    precission_after_coma
                );
                //Calculate itemCost
                let totalSelledCost = mathOperation(
                    productDetails.averageCost,
                    product.quantity,
                    "multiplication",
                    precission_after_coma
                );
                //If it is available, creating a virtual selledProduct
                let selled_product: any = {
                    name: productDetails.name,
                    measure: productDetails.measure,
                    colorCategory: productDetails.salesCategory?.color,
                    quantity: product.quantity,
                    productId: productDetails.id,
                    type: productDetails.type,
                    orderReceiptId: order.id,
                    economicCycleId: economicCycle.id,
                    imageId: productDetails.images?.[0]?.id,
                    addons: [],
                    productionAreaId,
                    observations: product.observations,
                    variationId: product.variationId,
                    priceUnitary: {
                        amount: itemPrice.price,
                        codeCurrency: itemPrice.codeCurrency,
                    },
                    modifiedPrice,
                };

                let addAddonsBulk: any = [];
                //Analizing if addons received
                if (product.addons && product.addons?.length !== 0) {
                    //hasAMenuProduct = true;
                    if (!["MENU", "SERVICE"].includes(productDetails.type)) {
                        t.rollback();
                        return res.status(400).json({
                            message: `Solo los productos de tipo Menú/Servicio pueden contener agregos. Agrego en ${productDetails.name} no válido.`,
                        });
                    }
                    let listProductWithAddonToRecord = [];
                    for (const addon of product.addons) {
                        const addon_found =
                            productDetails.availableAddons?.find(
                                item => item.id === addon.id
                            );
                        if (!addon_found) {
                            t.rollback();
                            return res.status(404).json({
                                message: `Addon id ${addon.id} provided not available in the product provided ${product.productId}.`,
                            });
                        }
                        //Calculate addon the cost
                        totalSelledCost += mathOperation(
                            addon_found.averageCost,
                            addon.quantity,
                            "multiplication",
                            precission_after_coma
                        );
                        listProductWithAddonToRecord.push(
                            `+(x${addon.quantity}) ${addon_found.name}`
                        );
                        //Obtaining price of product
                        const addonPrice =
                            obtainingProductPriceSystemPriceDefined(
                                addon_found,
                                undefined,
                                economicCycle.priceSystemId
                            );
                        if (!addonPrice) {
                            t.rollback();
                            return res.status(400).json({
                                message: `El precio del producto ${addon_found.name} no fue encontrado. Por favor consulte al propietario de negocio.`,
                            });
                        }
                        addAddonsBulk.push({
                            productId: addon.id,
                            quantity: addon.quantity,
                            price: {
                                amount: addonPrice.price,
                                codeCurrency: addonPrice.codeCurrency,
                            },
                            name: addon_found.name,
                        });
                        if (
                            addonPrice.codeCurrency === itemPrice.codeCurrency
                        ) {
                            totalSelledPrice +=
                                addonPrice.price * addon.quantity;
                        } else {
                            const availableCurrency = availableCurrencies.find(
                                item =>
                                    item.currency.code ===
                                    addonPrice?.codeCurrency
                            );
                            if (!availableCurrency) {
                                t.rollback();
                                return res.status(404).json({
                                    message: `The currency of addon not found as available`,
                                });
                            }
                            totalSelledPrice += mathOperation(
                                addonPrice.price,
                                availableCurrency.exchangeRate,
                                "multiplication",
                                2
                            );
                        }
                    }
                    listProductsToRecord.push(
                        `(x${product.quantity}) ${
                            productDetails.name
                        } ${listProductWithAddonToRecord.join(",")} agregado`
                    );
                } else {
                    //If not addons
                    listProductsToRecord.push(
                        `(x${product.quantity}) ${productDetails.name}`
                    );
                }
                //Adding to ticket if productionArea exist
                if (productionAreaId) {
                    const ticket_found = listTickets.find(
                        item => item.areaId === productionAreaId
                    );
                    if (ticket_found) {
                        selled_product.productionTicketId = ticket_found.id;
                    }
                }

                if (
                    ["MENU", "ADDON", "SERVICE", "COMBO"].includes(
                        productDetails.type
                    )
                    //||
                    // (shouldGenerateProductionTickets &&
                    //     productDetails.type === "STOCK")
                ) {
                    selled_product.status = "RECEIVED";
                    //Adding selled product to the virtual store for creating at the end
                    addBulkSelledProduct.push({
                        ...selled_product,
                        totalCost: totalSelledCost,
                        addons: addAddonsBulk,
                        priceTotal: {
                            amount: totalSelledPrice,
                            codeCurrency: itemPrice.codeCurrency,
                        },
                    });
                } else {
                    selled_product.status = !!selled_product.productionTicketId
                        ? "RECEIVED"
                        : "COMPLETED";

                    //Analyzing if product exist already
                    //Taking in consideration cacheSelledProducts because of deleted
                    let selledProductFound: any;
                    if (product.variationId) {
                        selledProductFound = cacheSelledProducts.find(
                            item =>
                                item.productId === productDetails.id &&
                                item.variationId === product.variationId
                        );
                    } else {
                        selledProductFound = cacheSelledProducts.find(
                            item =>
                                item.productId === productDetails.id &&
                                item?.priceUnitary?.amount ===
                                    itemPrice?.price &&
                                item?.priceUnitary?.codeCurrency ===
                                    itemPrice?.codeCurrency
                        );

                        // if (product.priceUnitary) {
                        // } else {
                        //     selledProductFound = cacheSelledProducts.find(
                        //         item => item.productId === productDetails.id
                        //     );
                        // }
                    }

                    //Search if the product with that price exists in the order
                    const existeProductModify = cacheSelledProducts.find(
                        item =>
                            item.productId === selled_product.productId &&
                            item?.priceUnitary?.amount ===
                                selled_product?.priceUnitary?.amount &&
                            item?.priceUnitary?.codeCurrency ===
                                selled_product?.priceUnitary?.codeCurrency
                    );

                    if (selledProductFound && existeProductModify) {
                        const newQuantity =
                            selledProductFound.quantity + product.quantity;
                        //Calculate itemCost
                        totalSelledCost = mathOperation(
                            productDetails.averageCost,
                            newQuantity,
                            "multiplication",
                            precission_after_coma
                        );

                        priceUpdates.push({
                            id: selledProductFound.priceTotalId,
                            amount: mathOperation(
                                itemPrice.price,
                                newQuantity,
                                "multiplication",
                                precission_after_coma
                            ),
                        });

                        selledProductUpdatesQuantities.push({
                            id: selledProductFound.id,
                            quantity: newQuantity,
                            status: selled_product.status,
                            observations: selled_product.observations,
                            totalCost: totalSelledCost,
                        });
                    } else {
                        //Adding selled product to the virtual store for creating at the end
                        addBulkSelledProduct.push({
                            ...selled_product,
                            totalCost: totalSelledCost,
                            addons: addAddonsBulk,
                            areaId: areaSale?.stockAreaId,
                            priceTotal: {
                                amount: totalSelledPrice,
                                codeCurrency: itemPrice.codeCurrency,
                            },
                        });
                    }
                }
            }

            //Registering actions
            listRecords.push({
                action: "PRODUCT_ADDED",
                title: getTitleOrderRecord("PRODUCT_ADDED"),
                details: listProductsToRecord.join(";"),
                madeById: user.id,
            });
        }

        //Updating local store object
        let nextSelledProducts = [];
        for (const element of order.selledProducts) {
            if (listIdsToDelete.includes(element.id)) {
                continue;
            }

            const found = selledProductUpdatesQuantities.find(
                item => item.id === element.id
            );

            if (found) {
                nextSelledProducts.push({
                    ...element.dataValues,
                    quantity: found.quantity,
                });
            } else {
                nextSelledProducts.push(element);
            }
        }

        cacheSelledProducts = nextSelledProducts.concat(addBulkSelledProduct);
        //Updating SelledProductAddon quantities
        if (selledProductAddonUpdatesQuantities.length !== 0) {
            const to_removed = selledProductAddonUpdatesQuantities.filter(
                item => item.quantity === 0
            );
            const update = selledProductAddonUpdatesQuantities.filter(
                item => item.quantity !== 0
            );
            await SelledProductAddon.bulkCreate(update, {
                updateOnDuplicate: ["quantity"],
                transaction: t,
            });
            if (to_removed.length !== 0) {
                await SelledProductAddon.destroy({
                    where: {
                        id: to_removed.map(item => item.id),
                    },
                    transaction: t,
                });
            }
        }

        //Creating stockSelledProducts if exists
        if (addBulkSelledProduct.length !== 0) {
            await SelledProduct.bulkCreate(addBulkSelledProduct, {
                include: [
                    {
                        model: SelledProductAddon,
                        as: "addons",
                        include: [{ model: Price, as: "priceUnitary" }],
                    },
                    { model: Price, as: "priceTotal" },
                    { model: Price, as: "priceUnitary" },
                ],
                transaction: t,
            });
        }

        //Updating prices
        if (priceUpdates.length !== 0) {
            const idRepeat: any = {};
            priceUpdates.forEach(item => {
                const id = item.id;
                idRepeat[id] = (idRepeat[id] || 0) + 1;
            });

            const totalPriceDuplicate = Object.keys(idRepeat).filter(
                id => idRepeat[id] > 1
            );

            // in case you are trying to insert and delete the same product at the same time avoid conflict
            if (totalPriceDuplicate.length !== 0) {
                t.rollback();
                return res.status(401).json({
                    message: ` Operación no permitida esta tratando de eliminar e insertar el mismo producto con el mismo precio a la vez.`,
                });
            }

            await Price.bulkCreate(priceUpdates, {
                updateOnDuplicate: ["amount"],
                transaction: t,
            });
        }

        //Updating SelledProduct Table
        //Verifiying there is no selled product to update that has been marked for delete
        const selled_to_update = selledProductUpdatesQuantities.filter(
            item => !listIdsToDelete.includes(item.id)
        );
        if (selled_to_update.length !== 0) {
            await SelledProduct.bulkCreate(selled_to_update, {
                updateOnDuplicate: [
                    "quantity",
                    "status",
                    "observations",
                    "totalCost",
                ],
                transaction: t,
            });
        }

        //Deleting selled Products
        if (listIdsToDelete.length !== 0) {
            await SelledProduct.destroy({
                where: {
                    id: listIdsToDelete,
                },
                transaction: t,
            });
        }

        let orderTemplate = {
            ...order.dataValues,
            selledProducts: cacheSelledProducts,
        };

        //--------update general info in sellProduct in case  the not add our deleted --->
        if (params.sellProductInfo) {
            const sellToUpdateInfo: Partial<SelledProduct>[] = [];
            let sellProductInfo = [...(params.sellProductInfo || [])];

            for (const sellProduct of sellProductInfo) {
                let sellProductInOrder = order.selledProducts.find(
                    (item: Partial<SelledProduct>) => item.id === sellProduct.id
                );

                if (sellProductInOrder) {
                    sellToUpdateInfo.push(sellProduct);
                }
            }

            if (sellToUpdateInfo.length !== 0) {
                await SelledProduct.bulkCreate(sellToUpdateInfo, {
                    updateOnDuplicate: ["observations"],
                    transaction: t,
                });
            }
        }

        await redisClient.set(
            getEphimeralTermKey(order.businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Setting totals
        const result_totals = await calculateOrderTotalV2(order.businessId, t);

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "modifyProductsInOrder/calculateOrderTotal",
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: user.businessId,
                    userId: user.id,
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        //update address the order
        if (params.shipping) {
            if (order.shipping) {
                await ShippingAddress.update(params.shipping, {
                    where: {
                        id: order.shipping.id,
                    },
                    transaction: t,
                });
            } else {
                const item = ShippingAddress.build({
                    ...params.shipping,
                    orderReceiptId: order.id,
                });

                await item.save({ transaction: t });
            }
        }

        if (params.billing) {
            if (order.billing) {
                await BillingAddress.update(params.billing, {
                    where: {
                        id: order.shipping.id,
                    },
                    transaction: t,
                });
            } else {
                const item = BillingAddress.build({
                    ...params.billing,
                    orderReceiptId: order.id,
                });
                await item.save({ transaction: t });
            }
        }

        if (params.clientId) {
            const client = await Client.findByPk(params.clientId);
            if (!client || client.businessId !== user.businessId) {
                t.rollback();
                return res.status(401).json({
                    message: `El cliente seleccionado no existe en su negocio.`,
                });
            }
        }

        const hasModifiedPrices = orderTemplate.selledProducts.some(
            (item: any) => item.modifiedPrice
        );

        order.modifiedPrice = hasModifiedPrices;

        //edit paymentDeadlineAt
        if (params.paymentDeadlineAt) {
            const today = moment();
            const newDeadLineAt = moment(params.paymentDeadlineAt);
            const orderCreatedAt = moment(order.createdAt);

            if (!newDeadLineAt.isValid()) {
                t.rollback();
                return res.status(401).json({
                    message: `La fecha de vencimiento no es una fecha valida.`,
                });
            }

            if (newDeadLineAt.isBefore(orderCreatedAt)) {
                t.rollback();
                return res.status(401).json({
                    message: `La nueva fecha de vencimiento no puede ser anterior a la fecha de creación de la factura.`,
                });
            }

            if (order.paymentDeadlineAt) {
                if (
                    newDeadLineAt.isAfter(today) &&
                    order.status === "OVERDUE"
                ) {
                    order.status = "PAYMENT_PENDING";
                }
            }

            order.paymentDeadlineAt = newDeadLineAt.toDate();
        }

        await order.save({ transaction: t });
        await t.commit();

        // Obtaining order
        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
            order.id
        );

        res.status(200).json(order_to_emit);
        if (params.sendMail) {
            const emailTemplate = "NEW_ORDER_NOTIFICATION_ADMIN";
            emailQueue.add(
                {
                    code: emailTemplate,
                    params: {
                        email: order_to_emit?.client?.email,
                        order_to_emit,
                        business,
                        type: "ORDER_EDITED_ADMIN",
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "PROCESS_PRODUCTS_IN_ORDER",
                params: {
                    order: order_to_emit,
                    productsAdded,
                    productsDeleted,
                    from: user.id,
                    newOrder: false,
                    fromName: user.displayName || user.username,
                    origin,
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (listRecords.length !== 0) {
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
        }

        let productsForChecking = [
            ...productsAdded.map(item => item.productId),
            ...productsDeleted.map(item => item.productId),
        ];

        if (productsForChecking.length !== 0) {
            productQueue.add(
                {
                    code: "CHECKING_PRODUCT",
                    params: {
                        productsIds: productsForChecking,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (listTickets.length !== 0 || toUpdateInProductionArea.length !== 0) {
            socketQueue.add(
                {
                    code: "PROCESS_TICKETS_PRODUCTION_AREA",
                    params: {
                        order: order_to_emit,
                        listTickets,
                        preparation_areas,
                        deleteInPreparationArea: toUpdateInProductionArea,
                        from: user.id,
                        fromName: user.displayName || user.username,
                        origin,
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const applyCouponToOrderAdmin = async (req: any, res: Response) => {
    try {
        const business: Business = req.business;
        const user: User = req.user;
        const { listProducts, coupons, clientId } = req.body;

        let priceSystemId;

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user?.businessId,
            },
        });

        if (activeEconomicCycle) {
            priceSystemId = activeEconomicCycle.priceSystemId;
        }

        if (!priceSystemId) {
            const priceSystem = await PriceSystem.findOne({
                where: {
                    isMain: true,
                    businessId: business.id,
                },
            });

            if (!priceSystem) {
                return res.status(400).json({
                    message:
                        "No fue encontrado un sistema de precio en el negocio. Por favor consulte al administrador.",
                });
            }

            priceSystemId = priceSystem.id;
        }

        const result = await processCoupons({
            coupons,
            listProducts,
            priceSystem: priceSystemId,
            businessId: business.id,
            clientId,
            userId: user.id,
        });

        if (!internalCheckerResponse(result)) {
            Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                origin: "sales/applyCouponToOrder",
                businessId: user.businessId,
                userId: user.id,
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        res.status(200).json(result.data);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
