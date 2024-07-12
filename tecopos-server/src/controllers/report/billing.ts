import { Response } from "express";
import { Op, where, fn, col } from "sequelize";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import EconomicCycle from "../../database/models/economicCycle";
import Store from "../../database/models/store";
import { obtainGeneralAreaSalesIncomes } from "../helpers/reports";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";
import OrderReceipt from "../../database/models/orderReceipt";
import CurrencyPayment from "../../database/models/currencyPayment";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import Client from "../../database/models/client";
import CustomerCategory from "../../database/models/customerCategory";
import SelledProduct from "../../database/models/selledProduct";
import CashRegisterOperation from "../../database/models/cashRegisterOperation";
import Price from "../../database/models/price";

export const listFinancialReportInEconomicCycle = async (
    req: any,
    res: Response
) => {
    try {
        const user: User = req.user;
        const {
            economicCycleId,
            includePendingOrders,
            includeAllCashOperations,
        } = req.body;

        const economicCycle = await EconomicCycle.findByPk(economicCycleId);

        if (!economicCycle) {
            return res.status(404).json({
                message: `El ciclo económico introducido no fue encontrado.`,
            });
        }

        //Checking if action belongs to user Business
        if (economicCycle.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (economicCycle.isActive) {
            return res.status(400).json({
                message: `El reporte solo puede ser procesado en ciclos económicos finalizados.`,
            });
        }

        const dataInStore = await Store.findOne({
            where: {
                type: "EC_INCOME_GENERAL",
                economicCycleId: economicCycle.id,
            },
        });

        if (!dataInStore) {
            return res.status(404).json({
                message: `Los datos del ciclo económico introducido no fueron encontrados.`,
            });
        }

        //Configurations
        const business_configs = await getBusinessConfigCache(user.businessId);
        const availableCurrencies = await getCurrenciesCache(user.businessId);
        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }
        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const resultEC = obtainGeneralAreaSalesIncomes(
            [JSON.parse(dataInStore.data)],
            main_currency,
            costCurrency
        );

        const orders = await OrderReceipt.findAll({
            attributes: [
                "id",
                "createdAt",
                "operationNumber",
                "observations",
                "preOperationNumber",
                "isPreReceipt",
                "status",
            ],
            where: {
                businessId: user.businessId,
                status: ["BILLED"],
                economicCycleId: economicCycle.id,
            },
            include: [
                {
                    model: SelledProduct,
                    attributes: ["id", "name", "quantity"],
                },
                {
                    model: Client,
                    attributes: [
                        "id",
                        "firstName",
                        "lastName",
                        "email",
                        "ci",
                        "codeClient",
                        "contractNumber",
                    ],
                    paranoid: false,
                    include: [
                        {
                            model: CustomerCategory,
                            attributes: ["name", "description"],
                        },
                    ],
                },
                {
                    model: CurrencyPayment,
                    attributes: ["amount", "codeCurrency", "paymentWay"],
                },
                {
                    model: Price,
                    as: "amountReturned",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: User,
                    as: "managedBy",
                    attributes: ["id", "username", "displayName"],
                    paranoid: false,
                },
                {
                    model: CashRegisterOperation,
                    attributes: [
                        "amount",
                        "operationNumber",
                        "codeCurrency",
                        "observations",
                        "operation",
                        "createdAt",
                    ],
                },
            ],
        });

        let cashOperations: Array<CashRegisterOperation> = [];
        let pendingOrders: Array<OrderReceipt> = [];

        if (includePendingOrders) {
            pendingOrders = await OrderReceipt.findAll({
                attributes: [
                    "id",
                    "createdAt",
                    "operationNumber",
                    "observations",
                    "preOperationNumber",
                    "isPreReceipt",
                ],
                where: {
                    businessId: user.businessId,
                    status: ["PAYMENT_PENDING", "OVERDUE"],
                    economicCycleId: economicCycle.id,
                },
                include: [
                    {
                        model: CurrencyPayment,
                        attributes: ["amount", "codeCurrency", "paymentWay"],
                    },
                    {
                        model: OrderReceiptTotal,
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: Client,
                        attributes: [
                            "id",
                            "firstName",
                            "lastName",
                            "email",
                            "ci",
                            "codeClient",
                            "contractNumber",
                        ],
                        paranoid: false,
                        include: [
                            {
                                model: CustomerCategory,
                                attributes: ["name", "description"],
                            },
                        ],
                    },
                ],
            });
        }

        if (includeAllCashOperations) {
            cashOperations = await CashRegisterOperation.findAll({
                where: {
                    economicCycleId: economicCycle.id,
                },
                attributes: [
                    "id",
                    "amount",
                    "codeCurrency",
                    "observations",
                    "operation",
                    "createdAt",
                    "operationNumber",
                ],
                include: [
                    {
                        model: User,
                        as: "madeBy",
                        attributes: ["id", "username", "displayName"],
                    },
                ],
            });
        }

        let exchange_rates = [];
        if (economicCycle.meta) {
            exchange_rates = JSON.parse(economicCycle.meta).exchange_rates;
        }

        return res.status(200).json({
            economicCycle: {
                createdAt: economicCycle.createdAt,
                openAt: economicCycle.openDate,
                closedAt: economicCycle.closedDate,
                ...resultEC,
            },
            exchange_rates,
            orders,
            cashOperations,
            pendingOrders,
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
