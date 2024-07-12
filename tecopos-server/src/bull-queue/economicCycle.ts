import Queue from "bull";
import moment from "moment";
import { Op, where, fn, col } from "sequelize";

import { JobECData } from "./interfaces";

import db from "../database/connection";
import EconomicCycle from "../database/models/economicCycle";
import {
    internalCheckerResponse,
    mathOperation,
    truncateValue,
} from "../helpers/utils";
import Logger from "../lib/logger";
import {
    areaSalesIncomeProcessator,
    closeEconomicCycle,
    obtainGeneralAreaSalesIncomes,
    openEconomicCycle,
} from "../controllers/helpers/reports";
import { config_transactions } from "../database/seq-transactions";
import Area from "../database/models/area";
import FundDestination from "../database/models/fundDestination";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
    getLongTermKey,
} from "../helpers/redisStructure";
import CashRegisterOperation from "../database/models/cashRegisterOperation";
import { payments_ways } from "../interfaces/nomenclators";
import OrderReceipt from "../database/models/orderReceipt";
import OrderReceiptPrice from "../database/models/orderReceiptPrice";
import CurrencyPayment from "../database/models/currencyPayment";
import Price from "../database/models/price";
import { getTitleAccountRecord } from "../helpers/translator";
import Account from "../database/models/account";
import AccountBalance from "../database/models/accountBalance";
import AccountOperation from "../database/models/accountOperation";
import AccountRecord from "../database/models/accountRecord";
import Store from "../database/models/store";
import Resource from "../database/models/resource";
import ProductionTicket from "../database/models/productionTicket";
import Business from "../database/models/business";
import { accountQueue } from "./account";
import { redisClient } from "../../app";

export const economicCycleQueue = new Queue(
    `economicCycle-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
economicCycleQueue.process(async (job: Queue.Job<JobECData>, done) => {
    try {
        switch (job.data.code) {
            case "CLOSE_EC":
                {
                    const t = await db.transaction(config_transactions);

                    try {
                        const { businessId, actionHour, isAnAutomatedAction } =
                            job.data.params;

                        //1. Checking if any Economic Cycle is open
                        const activeEconomicCycle = await EconomicCycle.findOne(
                            {
                                where: {
                                    businessId: businessId,
                                    isActive: true,
                                },
                            }
                        );

                        if (activeEconomicCycle) {
                            //2. Close the EC
                            const result = await closeEconomicCycle(
                                { businessId },
                                t
                            );

                            if (!internalCheckerResponse(result)) {
                                t.rollback();
                                Logger.error(
                                    result.message ||
                                        "Ha ocurrido un error inesperado.",
                                    {
                                        origin: "bull-queue/CLOSE_EC/closeEconomicCycle",
                                        businessId,
                                    }
                                );
                                done(new Error(result.message));
                                return;
                            }
                        }

                        await t.commit();

                        if (activeEconomicCycle) {
                            const hour = moment(new Date()).hour();
                            let closedAt = moment().format("YYYY-MM-DD HH:mm");
                            if (hour === 0) {
                                closedAt = moment(activeEconomicCycle.openDate)
                                    .endOf("day")
                                    .format("YYYY-MM-DD HH:mm");
                            }

                            economicCycleQueue.add(
                                {
                                    code: "AFTER_ECONOMIC_CYCLE_CLOSE",
                                    params: {
                                        businessId: businessId,
                                        economicCycleId: activeEconomicCycle.id,
                                        closedAt,
                                        actionHour,
                                        isAnAutomatedAction,
                                    },
                                },
                                {
                                    removeOnComplete: true,
                                    attempts: 30,
                                    removeOnFail: true,
                                }
                            );
                        }

                        //Analyzing cache and remove key in case exist
                        await redisClient.del(
                            getLongTermKey(businessId, "econocycle", "get")
                        );

                        done();
                    } catch (error: any) {
                        t.rollback();
                        Logger.error(error);
                        done(new Error(error.toString()));
                    }
                }
                break;

            case "OPEN_CLOSE_EC":
                {
                    const t = await db.transaction(config_transactions);
                    try {
                        const { businessId, actionHour, isAnAutomatedAction } =
                            job.data.params;

                        //1. Checking if any Economic Cycle is open
                        const activeEconomicCycle = await EconomicCycle.findOne(
                            {
                                where: {
                                    businessId: businessId,
                                    isActive: true,
                                },
                            }
                        );

                        if (activeEconomicCycle) {
                            //2. Close the EC
                            const result = await closeEconomicCycle(
                                { businessId },
                                t
                            );

                            if (!internalCheckerResponse(result)) {
                                t.rollback();
                                Logger.error(
                                    result.message ||
                                        "Ha ocurrido un error inesperado.",
                                    {
                                        origin: "bull-queue/OPEN_CLOSE_EC/closeEconomicCycle",
                                        businessId,
                                    }
                                );
                                done(new Error(result.message));
                                return;
                            }
                        }

                        //3. Open a new EC
                        const result = await openEconomicCycle(
                            { businessId },
                            t
                        );

                        if (!internalCheckerResponse(result)) {
                            t.rollback();
                            Logger.error(
                                result.message ||
                                    "Ha ocurrido un error inesperado.",
                                {
                                    origin: "bull-queue/OPEN_CLOSE_EC",
                                    businessId,
                                }
                            );
                            done(new Error(result.message));
                            return;
                        }

                        await t.commit();

                        //Analyzing cache and remove key in case exist
                        await redisClient.del(
                            getLongTermKey(businessId, "econocycle", "get")
                        );

                        if (activeEconomicCycle) {
                            const hour = moment(new Date()).hour();
                            let closedAt = moment().format("YYYY-MM-DD HH:mm");
                            if (hour === 0) {
                                closedAt = moment(activeEconomicCycle.openDate)
                                    .endOf("day")
                                    .format("YYYY-MM-DD HH:mm");
                            }

                            economicCycleQueue.add(
                                {
                                    code: "AFTER_ECONOMIC_CYCLE_CLOSE",
                                    params: {
                                        businessId: businessId,
                                        economicCycleId: activeEconomicCycle.id,
                                        closedAt,
                                        actionHour,
                                        isAnAutomatedAction,
                                    },
                                },
                                {
                                    removeOnComplete: true,
                                    attempts: 30,
                                    removeOnFail: true,
                                }
                            );
                        }

                        done();
                    } catch (error: any) {
                        t.rollback();
                        Logger.error(error);
                        done(new Error(error.toString()));
                    }
                }
                break;

            case "AFTER_ECONOMIC_CYCLE_CLOSE":
                {
                    const t = await db.transaction(config_transactions);

                    try {
                        const {
                            businessId,
                            economicCycleId,
                            userId,
                            closedAt,
                            actionHour,
                            isAnAutomatedAction,
                        } = job.data.params;

                        const configurations = await getBusinessConfigCache(
                            businessId
                        );

                        const isModuleAccountsActive =
                            configurations.find(
                                item => item.key === "module_accounts"
                            )?.value === "true";
                        const extract_salary_from_cash =
                            configurations.find(
                                item => item.key === "extract_salary_from_cash"
                            )?.value === "true";
                        const calculate_salary_from_revenue =
                            configurations.find(
                                item => item.key === "calculate_salary_from"
                            )?.value === "GROSS_REVENUE";

                        const transfer_orders_to_next_economic_cycle =
                            configurations.find(
                                item =>
                                    item.key ===
                                    "transfer_orders_to_next_economic_cycle"
                            )?.value === "true";

                        //Obtaining all area Sales
                        const areas = await Area.findAll({
                            where: {
                                businessId: businessId,
                                type: "SALE",
                            },
                            include: [FundDestination],
                            transaction: t,
                        });

                        //Checking if founds must be transfers to an account
                        const availableCurrencies = await getCurrenciesCache(
                            businessId
                        );

                        const main_currency = availableCurrencies.find(
                            item => item.isMain
                        );

                        if (!main_currency) {
                            t.rollback();
                            Logger.error(`There is no main currency defined.`, {
                                origin: "bull-queue/OPEN_CLOSE_EC/main_currency",
                                businessId,
                            });
                            done(
                                new Error(`There is no main currency defined.`)
                            );
                            return;
                        }

                        const costCurrency =
                            configurations.find(
                                item => item.key === "general_cost_currency"
                            )?.value || main_currency.currency.code;

                        let listOperations = [];
                        let listRecordOperations = [];
                        let bulkStore = [];
                        for (const area of areas) {
                            if (
                                isModuleAccountsActive &&
                                area.transferFoundsAfterClose
                            ) {
                                let totalSales: Array<{
                                    amount: number;
                                    codeCurrency: string;
                                }> = [];
                                let totalCost = {
                                    amount: 0,
                                    codeCurrency: costCurrency,
                                };
                                let totalSalesInMainCurrency = {
                                    amount: 0,
                                    codeCurrency: main_currency.currency.code,
                                };
                                let taxes: Array<{
                                    amount: number;
                                    codeCurrency: string;
                                }> = [];

                                let totalSalary = {
                                    amount: 0,
                                    codeCurrency: main_currency.currency.code,
                                };
                                let totalInCash: Array<{
                                    amount: number;
                                    codeCurrency: string;
                                }> = [];
                                let operationsToRegister: Array<CashRegisterOperation> =
                                    [];
                                let totalIncomesNotInCash: Array<{
                                    amount: number;
                                    codeCurrency: string;
                                    paymentWay: payments_ways;
                                }> = [];

                                //All requested
                                const [operations, orders] = await Promise.all([
                                    CashRegisterOperation.findAll({
                                        where: {
                                            economicCycleId: economicCycleId,
                                            areaId: area.id,
                                        },
                                    }),
                                    OrderReceipt.findAll({
                                        where: {
                                            economicCycleId: economicCycleId,
                                            status: "BILLED",
                                            areaSalesId: area.id,
                                        },
                                        include: [
                                            OrderReceiptPrice,
                                            CurrencyPayment,
                                            {
                                                model: Price,
                                                as: "taxes",
                                            },
                                        ],
                                    }),
                                ]);

                                //Cash operations
                                for (const operation of operations) {
                                    if (
                                        operation.includeAsAccountOperation &&
                                        [
                                            "MANUAL_DEPOSIT",
                                            "MANUAL_WITHDRAW",
                                        ].includes(operation.operation)
                                    ) {
                                        operationsToRegister.push(operation);
                                    }

                                    if (
                                        ![
                                            "MANUAL_DEPOSIT",
                                            "MANUAL_WITHDRAW",
                                            "MANUAL_FUND",
                                        ].includes(operation.operation)
                                    ) {
                                        //Total in Cash
                                        const found_total = totalInCash.find(
                                            item =>
                                                item.codeCurrency ===
                                                operation.codeCurrency
                                        );
                                        if (found_total) {
                                            totalInCash = totalInCash.map(
                                                item => {
                                                    if (
                                                        item.codeCurrency ===
                                                        found_total.codeCurrency
                                                    ) {
                                                        return {
                                                            ...item,
                                                            amount:
                                                                item.amount +
                                                                operation.amount,
                                                        };
                                                    }
                                                    return item;
                                                }
                                            );
                                        } else {
                                            totalInCash = [
                                                ...totalInCash,
                                                {
                                                    amount: operation.amount,
                                                    codeCurrency:
                                                        operation.codeCurrency,
                                                },
                                            ];
                                        }
                                    }
                                }

                                //Iterating all orders
                                for (const order of orders) {
                                    //Analyzing payments in order
                                    for (const payment of order.currenciesPayment) {
                                        if (payment.paymentWay !== "CASH") {
                                            const found_total_not_cash =
                                                totalIncomesNotInCash.find(
                                                    item =>
                                                        item.codeCurrency ===
                                                            payment.codeCurrency &&
                                                        item.paymentWay ===
                                                            payment.paymentWay
                                                );

                                            if (found_total_not_cash) {
                                                totalIncomesNotInCash =
                                                    totalIncomesNotInCash.map(
                                                        item => {
                                                            if (
                                                                item.codeCurrency ===
                                                                    payment.codeCurrency &&
                                                                item.paymentWay ===
                                                                    payment.paymentWay
                                                            ) {
                                                                return {
                                                                    ...item,
                                                                    amount:
                                                                        item.amount +
                                                                        payment.amount,
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
                                                        codeCurrency:
                                                            payment.codeCurrency,
                                                        paymentWay:
                                                            payment.paymentWay,
                                                    },
                                                ];
                                            }
                                        }
                                    }

                                    for (const price of order.prices) {
                                        //Taxes
                                        if (order.taxes) {
                                            const found_taxes = taxes.find(
                                                tax =>
                                                    tax.codeCurrency ===
                                                    order.taxes?.codeCurrency
                                            );

                                            if (found_taxes) {
                                                taxes = taxes.map(tax => {
                                                    if (
                                                        tax.codeCurrency ===
                                                        order.taxes
                                                            ?.codeCurrency
                                                    ) {
                                                        return {
                                                            ...tax,
                                                            amount:
                                                                tax.amount +
                                                                order.taxes
                                                                    ?.amount,
                                                        };
                                                    }
                                                    return tax;
                                                });
                                            } else {
                                                taxes.push({
                                                    amount: order.taxes?.amount,
                                                    codeCurrency:
                                                        order.taxes
                                                            ?.codeCurrency,
                                                });
                                            }
                                        }

                                        //Total Sales
                                        if (!order.houseCosted) {
                                            const found_price = totalSales.find(
                                                sale =>
                                                    sale.codeCurrency ===
                                                    price.codeCurrency
                                            );

                                            if (found_price) {
                                                totalSales = totalSales.map(
                                                    sale => {
                                                        if (
                                                            sale.codeCurrency ===
                                                            price.codeCurrency
                                                        ) {
                                                            return {
                                                                ...sale,
                                                                amount:
                                                                    sale.amount +
                                                                    price.price,
                                                            };
                                                        }
                                                        return sale;
                                                    }
                                                );
                                            } else {
                                                totalSales.push({
                                                    amount: price.price,
                                                    codeCurrency:
                                                        price.codeCurrency,
                                                });
                                            }

                                            totalCost.amount += order.totalCost;
                                        }
                                    }

                                    //Including taxes to TotalSales
                                    if (taxes.length !== 0) {
                                        for (const tax of taxes) {
                                            const found_price = totalSales.find(
                                                sale =>
                                                    sale.codeCurrency ===
                                                    tax.codeCurrency
                                            );

                                            if (found_price) {
                                                totalSales = totalSales.map(
                                                    sale => {
                                                        if (
                                                            sale.codeCurrency ===
                                                            tax.codeCurrency
                                                        ) {
                                                            return {
                                                                ...sale,
                                                                amount:
                                                                    sale.amount +
                                                                    tax.amount,
                                                            };
                                                        }
                                                        return sale;
                                                    }
                                                );
                                            } else {
                                                totalSales.push({
                                                    amount: tax.amount,
                                                    codeCurrency:
                                                        tax.codeCurrency,
                                                });
                                            }
                                        }
                                    }
                                }

                                //TotalSales in Main currency
                                totalSales.forEach(sales => {
                                    const found = availableCurrencies.find(
                                        item =>
                                            item.currency.code ===
                                            sales.codeCurrency
                                    );

                                    if (!found) {
                                        return {
                                            status: 400,
                                            message: `La moneda ${sales.codeCurrency} no está disponible en el negocio`,
                                        };
                                    }

                                    totalSalesInMainCurrency.amount +=
                                        mathOperation(
                                            sales.amount,
                                            found.exchangeRate,
                                            "multiplication",
                                            2
                                        );
                                });

                                if (extract_salary_from_cash) {
                                    let base = totalSalesInMainCurrency.amount;
                                    if (calculate_salary_from_revenue) {
                                        base = mathOperation(
                                            totalSalesInMainCurrency.amount,
                                            totalCost.amount,
                                            "subtraction",
                                            2
                                        );
                                    }

                                    //Analyzing area sale configuration
                                    if (
                                        area.enableSalaryByPercent &&
                                        base >= Number(area.enablePercentAfter)
                                    ) {
                                        const salary = mathOperation(
                                            base,
                                            Number(area.salaryPercent) / 100,
                                            "multiplication"
                                        );
                                        totalSalary = {
                                            amount: salary * -1,
                                            codeCurrency:
                                                main_currency.currency.code,
                                        };
                                    } else {
                                        totalSalary = {
                                            amount: area.salaryFixed * -1,
                                            codeCurrency:
                                                main_currency.currency.code,
                                        };
                                    }
                                }

                                //Registering in the corresponding account
                                const accounts = area.fundDestinations;
                                const defaultAccount =
                                    area.fundDestinations.find(
                                        item => item.default
                                    );
                                let localPricesToBalance: Array<{
                                    amount: number;
                                    codeCurrency: string;
                                    accountId: number;
                                }> = [];

                                //Total In Cash
                                for (const item of totalInCash) {
                                    const foundAccount = accounts.find(
                                        element =>
                                            element.paymentWay === "CASH" &&
                                            element.codeCurrency ===
                                                item.codeCurrency
                                    );
                                    const selectedAccount =
                                        foundAccount ?? defaultAccount;

                                    if (selectedAccount) {
                                        let body: any = {
                                            operation: "debit",
                                            description: `Ingreso en efectivo. Cierre de Punto de venta ${area.name}`,
                                            amount: {
                                                amount: item.amount,
                                                codeCurrency: item.codeCurrency,
                                            },
                                            accountId:
                                                selectedAccount.accountId,
                                            madeById: userId ?? 1,
                                            blocked: true,
                                            registeredAt: closedAt,
                                        };

                                        if (selectedAccount.accountTagId) {
                                            body = {
                                                ...body,
                                                accountTagId:
                                                    selectedAccount.accountTagId,
                                            };
                                        }

                                        listOperations.push(body);
                                        listRecordOperations.push({
                                            action: "OPERATION_ADDED",
                                            title: getTitleAccountRecord(
                                                "OPERATION_ADDED"
                                            ),
                                            accountId:
                                                selectedAccount.accountId,
                                            madeById: userId ?? 1,
                                            details: `Se realizó una nueva operación de ingreso por ${item.amount}/${item.codeCurrency} al cierre de un ciclo económico.`,
                                        });

                                        //Updating in local Price to balance
                                        const foundInBalance =
                                            localPricesToBalance.find(
                                                element =>
                                                    element.codeCurrency ===
                                                        item.codeCurrency &&
                                                    element.accountId ===
                                                        selectedAccount.accountId
                                            );
                                        if (foundInBalance) {
                                            localPricesToBalance =
                                                localPricesToBalance.map(
                                                    element => {
                                                        if (
                                                            element.codeCurrency ===
                                                                item.codeCurrency &&
                                                            element.accountId ===
                                                                selectedAccount.accountId
                                                        ) {
                                                            return {
                                                                ...element,
                                                                amount:
                                                                    element.amount +
                                                                    item.amount,
                                                            };
                                                        }

                                                        return element;
                                                    }
                                                );
                                        } else {
                                            localPricesToBalance.push({
                                                amount: item.amount,
                                                codeCurrency: item.codeCurrency,
                                                accountId:
                                                    selectedAccount.accountId,
                                            });
                                        }
                                    }
                                }

                                //Total not In Cash
                                for (const item of totalIncomesNotInCash) {
                                    const foundAccount = accounts.find(
                                        element =>
                                            element.paymentWay === "TRANSFER" &&
                                            element.codeCurrency ===
                                                item.codeCurrency
                                    );
                                    const selectedAccount =
                                        foundAccount ?? defaultAccount;

                                    if (selectedAccount) {
                                        let body: any = {
                                            operation: "debit",
                                            description: `Ingreso en transferencias. Cierre en Punto de venta ${area.name}`,
                                            amount: {
                                                amount: item.amount,
                                                codeCurrency: item.codeCurrency,
                                            },
                                            accountId:
                                                selectedAccount.accountId,
                                            madeById: userId ?? 1,
                                            blocked: true,
                                            registeredAt: closedAt,
                                        };

                                        if (selectedAccount.accountTagId) {
                                            body = {
                                                ...body,
                                                accountTagId:
                                                    selectedAccount.accountTagId,
                                            };
                                        }

                                        listOperations.push(body);
                                        listRecordOperations.push({
                                            action: "OPERATION_ADDED",
                                            title: getTitleAccountRecord(
                                                "OPERATION_ADDED"
                                            ),
                                            accountId:
                                                selectedAccount.accountId,
                                            madeById: userId ?? 1,
                                            details: `Se realizó una nueva operación de ingreso por ${item.amount}/${item.codeCurrency} al cierre de un ciclo económico.`,
                                        });

                                        //Updating in local Price to balance
                                        const foundInBalance =
                                            localPricesToBalance.find(
                                                element =>
                                                    element.codeCurrency ===
                                                        item.codeCurrency &&
                                                    element.accountId ===
                                                        selectedAccount.accountId
                                            );
                                        if (foundInBalance) {
                                            localPricesToBalance =
                                                localPricesToBalance.map(
                                                    element => {
                                                        if (
                                                            element.codeCurrency ===
                                                                item.codeCurrency &&
                                                            element.accountId ===
                                                                selectedAccount.accountId
                                                        ) {
                                                            return {
                                                                ...element,
                                                                amount:
                                                                    element.amount +
                                                                    item.amount,
                                                            };
                                                        }

                                                        return element;
                                                    }
                                                );
                                        } else {
                                            localPricesToBalance.push({
                                                amount: item.amount,
                                                codeCurrency: item.codeCurrency,
                                                accountId:
                                                    selectedAccount.accountId,
                                            });
                                        }
                                    }
                                }

                                //Salary
                                if (
                                    extract_salary_from_cash &&
                                    totalSalary.amount !== 0
                                ) {
                                    const foundAccount = accounts.find(
                                        element =>
                                            element.paymentWay === "CASH" &&
                                            element.codeCurrency ===
                                                totalSalary.codeCurrency
                                    );
                                    const selectedAccount =
                                        foundAccount ?? defaultAccount;

                                    if (selectedAccount) {
                                        let body: any = {
                                            operation: "credit",
                                            description: `Extracción automática por concepto de Salario en Punto de venta: ${area.name}`,
                                            amount: {
                                                amount: totalSalary.amount,
                                                codeCurrency:
                                                    totalSalary.codeCurrency,
                                            },
                                            accountId:
                                                selectedAccount.accountId,
                                            madeById: userId ?? 1,
                                            blocked: true,
                                            createdAt: closedAt,
                                            registeredAt: closedAt,
                                        };

                                        listOperations.push(body);
                                        listRecordOperations.push({
                                            action: "OPERATION_ADDED",
                                            title: getTitleAccountRecord(
                                                "OPERATION_ADDED"
                                            ),
                                            accountId:
                                                selectedAccount.accountId,
                                            madeById: userId ?? 1,
                                            details: `Se realizó una nueva operación de gasto por concepto de salario de ${totalSalary.amount}/${totalSalary.codeCurrency} al cierre de un ciclo económico.`,
                                        });

                                        //Updating in local Price to balance
                                        const foundInBalance =
                                            localPricesToBalance.find(
                                                element =>
                                                    element.codeCurrency ===
                                                        totalSalary.codeCurrency &&
                                                    element.accountId ===
                                                        selectedAccount.accountId
                                            );
                                        if (foundInBalance) {
                                            localPricesToBalance =
                                                localPricesToBalance.map(
                                                    element => {
                                                        if (
                                                            element.codeCurrency ===
                                                                totalSalary.codeCurrency &&
                                                            element.accountId ===
                                                                selectedAccount.accountId
                                                        ) {
                                                            return {
                                                                ...element,
                                                                amount:
                                                                    element.amount +
                                                                    totalSalary.amount,
                                                            };
                                                        }

                                                        return element;
                                                    }
                                                );
                                        } else {
                                            localPricesToBalance.push({
                                                amount: totalSalary.amount,
                                                codeCurrency:
                                                    totalSalary.codeCurrency,
                                                accountId:
                                                    selectedAccount.accountId,
                                            });
                                        }
                                    }
                                }

                                //Registering other operations
                                for (const operation of operationsToRegister) {
                                    const foundAccount = accounts.find(
                                        element =>
                                            element.paymentWay === "CASH" &&
                                            element.codeCurrency ===
                                                operation.codeCurrency
                                    );
                                    const selectedAccount =
                                        foundAccount ?? defaultAccount;

                                    if (selectedAccount) {
                                        let processedAmount = operation.amount;
                                        if (
                                            operation.type === "debit" &&
                                            processedAmount < 0
                                        ) {
                                            processedAmount =
                                                Math.abs(processedAmount);
                                        }

                                        if (
                                            operation.type === "credit" &&
                                            processedAmount > 0
                                        ) {
                                            processedAmount =
                                                processedAmount * -1;
                                        }

                                        listOperations.push({
                                            operation: operation.type,
                                            description: operation.observations,
                                            amount: {
                                                amount: operation.amount,
                                                codeCurrency:
                                                    operation.codeCurrency,
                                            },
                                            accountId:
                                                selectedAccount.accountId,
                                            blocked: true,
                                            madeById: operation.madeById,
                                            registeredAt: closedAt,
                                        });

                                        const typeOperation =
                                            operation.type === "debit"
                                                ? "ingreso"
                                                : "gasto";
                                        const formattedAmount = `${operation.amount}/${operation.codeCurrency}`;

                                        listRecordOperations.push({
                                            action: "OPERATION_ADDED",
                                            title: getTitleAccountRecord(
                                                "OPERATION_ADDED"
                                            ),
                                            accountId:
                                                selectedAccount.accountId,
                                            madeById: operation.madeById,
                                            registeredAt: closedAt,
                                            details: `Se realizó una nueva operación de ${typeOperation} por ${formattedAmount} al cierre de un ciclo económico. ${
                                                operation.observations || ``
                                            }`,
                                        });

                                        //Updating in local Price to balance
                                        const foundInBalance =
                                            localPricesToBalance.find(
                                                element =>
                                                    element.codeCurrency ===
                                                        operation.codeCurrency &&
                                                    element.accountId ===
                                                        selectedAccount.accountId
                                            );
                                        if (foundInBalance) {
                                            localPricesToBalance =
                                                localPricesToBalance.map(
                                                    element => {
                                                        if (
                                                            element.codeCurrency ===
                                                                operation.codeCurrency &&
                                                            element.accountId ===
                                                                selectedAccount.accountId
                                                        ) {
                                                            return {
                                                                ...element,
                                                                amount:
                                                                    element.amount +
                                                                    processedAmount,
                                                            };
                                                        }

                                                        return element;
                                                    }
                                                );
                                        } else {
                                            localPricesToBalance.push({
                                                amount: processedAmount,
                                                codeCurrency:
                                                    operation.codeCurrency,
                                                accountId:
                                                    selectedAccount.accountId,
                                            });
                                        }
                                    }
                                }

                                //Updating balance account in the accounts
                                const uniqueAccounts = Array.from(
                                    new Set([
                                        ...localPricesToBalance.map(
                                            item => item.accountId
                                        ),
                                    ])
                                );

                                for (const accountId of uniqueAccounts) {
                                    const account = await Account.findByPk(
                                        accountId,
                                        {
                                            include: [
                                                {
                                                    model: Price,
                                                    through: {
                                                        attributes: [],
                                                    },
                                                    as: "actualBalance",
                                                },
                                            ],
                                            transaction: t,
                                        }
                                    );

                                    if (account && !account.isBlocked) {
                                        //--> BLOCK ACCOUNT PRICE
                                        const pricesToBlock =
                                            account.actualBalance?.map(
                                                item => item.id
                                            );
                                        await Price.findAll({
                                            where: {
                                                id: pricesToBlock,
                                            },
                                            lock: true,
                                            transaction: t,
                                        });
                                        //-> END BLOCK DECLARATION

                                        //Updating actual balance
                                        if (account.actualBalance) {
                                            const filteredBalances =
                                                localPricesToBalance.filter(
                                                    balance =>
                                                        balance.accountId ===
                                                        accountId
                                                );
                                            for (const operation of filteredBalances) {
                                                const found =
                                                    account.actualBalance.find(
                                                        item =>
                                                            item.codeCurrency ===
                                                            operation.codeCurrency
                                                    );

                                                let beforeBalance = `0/${
                                                    found?.codeCurrency || "-"
                                                }`;
                                                let afterBalance = `0/${
                                                    found?.codeCurrency || "-"
                                                }`;

                                                if (found) {
                                                    beforeBalance = `${
                                                        found?.amount
                                                    }/${
                                                        found?.codeCurrency ||
                                                        "-"
                                                    }`;
                                                    found.amount =
                                                        mathOperation(
                                                            found.amount,
                                                            operation.amount,
                                                            "addition",
                                                            2
                                                        );
                                                    await found.save({
                                                        transaction: t,
                                                    });
                                                    afterBalance = `${found.amount}/${found.codeCurrency}`;
                                                } else {
                                                    const priceBalance =
                                                        Price.build({
                                                            amount: operation.amount,
                                                            codeCurrency:
                                                                operation.codeCurrency,
                                                        });
                                                    await priceBalance.save({
                                                        transaction: t,
                                                    });

                                                    const balancePrice =
                                                        AccountBalance.build({
                                                            accountId:
                                                                account.id,
                                                            priceId:
                                                                priceBalance.id,
                                                        });
                                                    await balancePrice.save({
                                                        transaction: t,
                                                    });
                                                    afterBalance = `${priceBalance.amount}/${priceBalance.codeCurrency}`;
                                                }

                                                let amountBalance =
                                                    beforeBalance.split("/")[0];
                                                beforeBalance.split("/")[0] =
                                                    truncateValue(
                                                        amountBalance,
                                                        2
                                                    ).toString();

                                                amountBalance =
                                                    afterBalance.split("/")[0];
                                                afterBalance.split("/")[0] =
                                                    truncateValue(
                                                        amountBalance,
                                                        2
                                                    ).toString();

                                                listRecordOperations.push({
                                                    action: "BALANCE_STATUS",
                                                    title: getTitleAccountRecord(
                                                        "BALANCE_STATUS"
                                                    ),
                                                    accountId: account.id,
                                                    madeById: 1,
                                                    registeredAt: closedAt,
                                                    details: `Saldo antes del cierre del ciclo económico: ${beforeBalance}, Saldo después: ${afterBalance}.`,
                                                });
                                            }
                                        }
                                    }
                                }
                            }

                            //Saving register historically
                            const result = await areaSalesIncomeProcessator({
                                economicCycleId,
                                area,
                                mainCurrency: main_currency,
                                availableCurrencies,
                                extractSalary: extract_salary_from_cash,
                                salaryFromRevenue:
                                    calculate_salary_from_revenue,
                                costCodeCurrency: costCurrency,
                            });

                            if (!internalCheckerResponse(result)) {
                                t.rollback();
                                Logger.error(
                                    result.message ||
                                        "Ha ocurrido un error inesperado.",
                                    {
                                        origin: "closeEconomicCycle/areaSalesIncomeProcessator",
                                    }
                                );
                                done(new Error(result.message));
                                return result;
                            }

                            bulkStore.push({
                                data: JSON.stringify(result.data),
                                type: "EC_INCOME_AREA",
                                madeById: userId ?? 1,
                                areaId: area.id,
                                economicCycleId: economicCycleId,
                                businessId: businessId,
                            });
                        }

                        //Processing sum of EC_INCOME_AREA
                        if (bulkStore.length === 1) {
                            bulkStore.push({
                                data: bulkStore[0].data,
                                type: "EC_INCOME_GENERAL",
                                madeById: userId ?? 1,
                                economicCycleId: economicCycleId,
                                businessId: businessId,
                            });
                        } else if (bulkStore.length > 1) {
                            const result = obtainGeneralAreaSalesIncomes(
                                bulkStore.map(item => JSON.parse(item.data)),
                                main_currency,
                                costCurrency
                            );

                            bulkStore.push({
                                data: JSON.stringify(result),
                                type: "EC_INCOME_GENERAL",
                                madeById: userId ?? 1,
                                economicCycleId: economicCycleId,
                                businessId: businessId,
                            });
                        }

                        //Registering operations
                        if (listOperations.length !== 0) {
                            const result = await AccountOperation.bulkCreate(
                                listOperations,
                                {
                                    include: [{ model: Price, as: "amount" }],
                                    transaction: t,
                                    returning: true,
                                }
                            );

                            let updatedTransaction: Array<any> = [];
                            for (const item of result) {
                                updatedTransaction.push({
                                    id: item.id,
                                    noTransaction: `T-${item.id}`,
                                });
                            }

                            await AccountOperation.bulkCreate(
                                updatedTransaction,
                                {
                                    updateOnDuplicate: ["noTransaction"],
                                    transaction: t,
                                }
                            );
                        }

                        if (listRecordOperations.length !== 0) {
                            await AccountRecord.bulkCreate(
                                listRecordOperations,
                                {
                                    transaction: t,
                                }
                            );
                        }

                        //Registering historical
                        if (bulkStore.length !== 0) {
                            await Store.bulkCreate(bulkStore, {
                                transaction: t,
                            });
                        }

                        //Restoring all the resources in all SALE areas
                        await Resource.update(
                            {
                                isAvailable: true,
                            },
                            {
                                where: {
                                    areaId: areas.map(item => item.id),
                                },
                            }
                        );

                        //Closing all production ticket still open
                        if (!transfer_orders_to_next_economic_cycle) {
                            const open_production_tickets =
                                await ProductionTicket.findAll({
                                    include: [
                                        {
                                            model: OrderReceipt,
                                            where: {
                                                economicCycleId,
                                            },
                                        },
                                    ],
                                    where: {
                                        status: {
                                            [Op.not]: ["DISPATCHED", "CLOSED"],
                                        },
                                    },
                                });

                            if (open_production_tickets.length !== 0) {
                                await ProductionTicket.update(
                                    {
                                        status: "CLOSED",
                                    },
                                    {
                                        where: {
                                            id: open_production_tickets.map(
                                                item => item.id
                                            ),
                                        },
                                        transaction: t,
                                    }
                                );
                            }
                        }

                        await t.commit();

                        if (
                            actionHour !== undefined &&
                            actionHour === 0 &&
                            isAnAutomatedAction
                        ) {
                            const day = moment(new Date()).subtract(1, "day");
                            const init = day
                                .startOf("day")
                                .format("YYYY-MM-DD HH:mm:ss");
                            const ends = day
                                .endOf("day")
                                .format("YYYY-MM-DD HH:mm:ss");

                            const allAccountsWithAutomatedCycleAt12M =
                                await Account.findAll({
                                    include: [
                                        {
                                            model: Business,
                                            where: {
                                                status: "ACTIVE",
                                                id: businessId,
                                            },
                                        },
                                    ],
                                });

                            for (const account of allAccountsWithAutomatedCycleAt12M) {
                                accountQueue.add(
                                    {
                                        code: "DAILY_BALANCE",
                                        params: {
                                            accountId: account.id,
                                            init,
                                            end: ends,
                                        },
                                    },
                                    {
                                        attempts: 2,
                                        removeOnComplete: true,
                                        removeOnFail: true,
                                    }
                                );
                            }
                        }

                        done();
                    } catch (error: any) {
                        t.rollback();
                        Logger.error(error);
                        done(new Error(error.toString()));
                    }
                }
                break;
        }
    } catch (error: any) {
        Logger.error(error);
        done(new Error(error.toString()));
    }
});
