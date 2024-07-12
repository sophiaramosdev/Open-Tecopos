import { Response } from "express";
import { Op, where, fn, col, literal } from "sequelize";
import db from "../../database/connection";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import { getAllBranchBusiness } from "../helpers/utils";
import FixedCostCategory from "../../database/models/fixedCostCategory";
import Price from "../../database/models/price";
import Product from "../../database/models/product";
import Variation from "../../database/models/variation";
import { config_transactions } from "../../database/seq-transactions";
import {
    getActiveEconomicCycleCache,
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";
import {
    exchangeCurrency,
    getProductPrice,
    mathOperation,
} from "../../helpers/utils";
import BuyedReceipt from "../../database/models/buyedReceipt";
import BatchBuyedProduct from "../../database/models/batchBuyedProduct";
import Batch from "../../database/models/batch";
import DocumentBuyedReceipt from "../../database/models/documentBuyedReceipt";
import BuyedReceiptOperation from "../../database/models/buyedReceiptOperation";
import Document from "../../database/models/document";
import Area from "../../database/models/area";
import Image from "../../database/models/image";
import Business from "../../database/models/business";
import Account from "../../database/models/account";
import BusinessBranch from "../../database/models/businessBranch";
import { SimplePrice } from "../../interfaces/commons";
import { getTitleAccountRecord } from "../../helpers/translator";
import AccountBalance from "../../database/models/accountBalance";
import BuyedReceiptFixedCost from "../../database/models/buyedReceiptFixedCost";
import AccountOperation from "../../database/models/accountOperation";
import AccountRecord from "../../database/models/accountRecord";
import moment from "moment";
import { buyedReceiptQueue } from "../../bull-queue/buyedReceipt";
import ProductPrice from "../../database/models/productPrice";
import Dispatch from "../../database/models/dispatch";
import DispatchProduct from "../../database/models/dispatchProduct";
import StockMovement from "../../database/models/stockMovement";
import { socketQueue } from "../../bull-queue/socket";
import { productQueue } from "../../bull-queue/product";

interface BatchProductBuyed {
    productId: number;
    barCode: string;
    variationId: number;
    observations: string;
    uniqueCode?: string;
    expirationAt: string;
    quantity: number;
    noPackages: number;
    priceUnitary: Price;
    supplierId: number;
    cost: Price;
    buyedProducts: Array<{
        status: string;
        quantity: number;
        observations?: string;
    }>;
}

interface BuyedFixedCostItem {
    registeredPrice: Price;
    observations: string;
    fixedCostCategoryId: number;
}

export const newBuyedReceipt = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const {
            batches,
            observations,
            listDocuments,
            stockAreaTo,
            accountId,
            operationsCosts,
        } = req.body;
        const user: User = req.user;

        const ids = batches
            .map((item: BatchProductBuyed) => item.productId)
            .filter((item: number) => !!item);
        const barCodes = batches
            .map((item: BatchProductBuyed) => item.barCode)
            .filter((item: string) => !!item);

        const retrieve_products = await Product.findAll({
            where: {
                [Op.or]: {
                    id: ids,
                    barCode: barCodes,
                },
                businessId: user.businessId,
            },
            include: [Variation],
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);
        const available_currencies = await getCurrenciesCache(user.businessId);
        const main_currency = available_currencies.find(item => item.isMain)!
            .currency.code;
        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || main_currency;

        let bulkBatches: Array<Partial<Batch>> = [];
        let totalUnits = 0;
        for (const batch of batches as BatchProductBuyed[]) {
            const found = retrieve_products.find(
                item => item.id === batch.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${batch.productId} no fue encontrado.`,
                });
            }

            if (
                ![
                    "STOCK",
                    "VARIATION",
                    "RAW",
                    "MANUFACTURED",
                    "ASSET",
                ].includes(found.type)
            ) {
                t.rollback();
                return res.status(400).json({
                    message: `El producto ${found.name} no es de tipo Almacenable. Operación no permitida.`,
                });
            }

            if (found.type === "VARIATION") {
                if (!batch.variationId) {
                    t.rollback();
                    return res.status(400).json({
                        message: `Para el producto ${found.name} no fue introducida una variación válida.`,
                    });
                }

                const foundVariation = found.variations.find(
                    item => item.id === batch.variationId
                );

                if (!foundVariation) {
                    t.rollback();
                    return res.status(404).json({
                        message: `La variación con id ${batch.variationId} del producto ${found.name} no fue encontrada.`,
                    });
                }
            }

            let price = { ...batch.cost } || {
                amount: 0,
                codeCurrency: costCurrency,
            };
            if (batch.cost && batch.cost.codeCurrency !== costCurrency) {
                price.amount =
                    exchangeCurrency(
                        {
                            amount: batch.cost.amount,
                            codeCurrency: batch.cost.codeCurrency,
                        },
                        costCurrency,
                        available_currencies
                    )?.amount || 0;
                price.codeCurrency = costCurrency;
            }

            let statusWhereReceived = batch.buyedProducts || [];
            if (statusWhereReceived.length === 0) {
                statusWhereReceived = [
                    {
                        status: "RECEIVED",
                        quantity: batch.quantity,
                    },
                ];
            }

            //Processing products
            bulkBatches.push({
                uniqueCode: batch.uniqueCode,
                //@ts-ignore
                grossCost: price,
                //@ts-ignore
                netCost: price,
                entryAt: new Date(),
                //@ts-ignore
                expirationAt: batch.expirationAt,
                entryQuantity: batch.quantity,
                availableQuantity: batch.quantity,
                productId: found.id,
                universalCode: found.universalCode,
                measure: found.measure,
                variationId: batch.variationId,
                noPackages: batch.noPackages,
                supplierId: batch.supplierId,
                businessId: user.businessId,
                registeredPrice: batch.cost || {
                    amount: 0,
                    codeCurrency: costCurrency,
                },
                //@ts-ignore
                buyedProducts: statusWhereReceived,
            });

            totalUnits = mathOperation(
                totalUnits,
                batch.quantity,
                "addition",
                2
            );
        }

        let listOperationCosts: Array<BuyedFixedCostItem> = [];
        let totalOperationCosts = 0;
        for (const operationCost of operationsCosts ?? []) {
            let newPrice = operationCost.registeredPrice;

            if (operationCost.registeredPrice.codeCurrency !== costCurrency) {
                newPrice.amount =
                    exchangeCurrency(
                        {
                            amount: operationCost.registeredPrice.amount,
                            codeCurrency:
                                operationCost.registeredPrice.codeCurrency,
                        },
                        costCurrency,
                        available_currencies
                    )?.amount || 0;
            }

            listOperationCosts.push({
                ...operationCost,
                costAmount: newPrice.amount,
            });

            totalOperationCosts = mathOperation(
                newPrice.amount,
                totalOperationCosts,
                "addition",
                2
            );
        }

        //Calculating netCost in each bathes
        let totalCost = 0;
        const perUnity = mathOperation(
            totalOperationCosts,
            totalUnits,
            "division",
            2
        );

        for (const batch of bulkBatches) {
            if (!batch.netCost || !batch.grossCost) {
                continue;
            }

            batch.netCost.amount = mathOperation(
                batch.grossCost.amount || 0,
                perUnity,
                "addition",
                2
            );

            const generalTotal = mathOperation(
                batch.entryQuantity || 0,
                batch.netCost.amount,
                "multiplication",
                2
            );

            totalCost = mathOperation(totalCost, generalTotal, "addition", 2);
        }

        //Obtain the last operationNumber
        let lastOperationNumber: number = await BuyedReceipt.max(
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
            //@ts-ignore
            lastOperationNumber += 1;
        }

        const template = {
            status: "CREATED",
            createdById: user.id,
            businessId: user.businessId,
            totalCost,
            observations,
            stockAreaToId: stockAreaTo,
            accountId,
            operationNumber: lastOperationNumber,
            operations: [
                {
                    madeById: user.id,
                    observations:
                        "Creación de Informe de Recepción de Mercancía",
                },
            ],
            batches: bulkBatches,
            costs: listOperationCosts,
        };

        const buyedReceipt = BuyedReceipt.build(template, {
            include: [
                {
                    model: Batch,
                    include: [
                        BatchBuyedProduct,
                        { model: Price, as: "grossCost" },
                        { model: Price, as: "netCost" },
                        { model: Price, as: "registeredPrice" },
                    ],
                },
                Document,
                BuyedReceiptOperation,
                BuyedReceiptFixedCost,
            ],
        });

        await buyedReceipt.save({ transaction: t });

        //Analyzing if documents where added
        if (listDocuments && listDocuments.length !== 0) {
            let listBulk = [];

            listBulk = listDocuments.map((item: number) => {
                return {
                    documentId: item,
                    buyedReceiptId: buyedReceipt.id,
                };
            });

            await DocumentBuyedReceipt.bulkCreate(listBulk, { transaction: t });
        }

        //Substrating amount from account
        //Validations
        if (accountId) {
            const listProductWithNoPrices = batches.filter(
                (item: BatchProductBuyed) => !item.cost
            );

            if (listProductWithNoPrices.length !== 0) {
                t.rollback();
                return res.status(400).json({
                    message: `Hay productos sin precios de costo. Por favor defina un costo antes de continuar.`,
                });
            }

            const account = await Account.findByPk(accountId, {
                include: [
                    {
                        model: User,
                        as: "allowedUsers",
                        through: {
                            attributes: [],
                        },
                    },
                    {
                        model: Price,
                        through: {
                            attributes: [],
                        },
                        as: "actualBalance",
                    },
                ],
                transaction: t,
            });

            if (!account) {
                t.rollback();
                return res.status(404).json({
                    message: `Account not found`,
                });
            }

            if (account.isBlocked) {
                t.rollback();
                return res.status(400).json({
                    message: `La cuenta se encuentra bloqueada. Consulte al propietario de la misma.`,
                });
            }

            if (!account.allowMultiCurrency) {
                if (
                    batches.some(
                        (item: BatchProductBuyed) =>
                            item.cost.codeCurrency !== account.definedCurrency
                    )
                ) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La cuenta solo admite operaciones en ${account.definedCurrency}.`,
                    });
                }
            }

            //Checking if action belongs to user Business
            if (account.isPrivate) {
                if (
                    account.ownerId !== user.id &&
                    !account.allowedUsers?.find(item => item.id === user.id) &&
                    !user.isSuperAdmin
                ) {
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }
            } else {
                let allowedBusiness: Array<number> = [];
                if (
                    user.roles?.map(item => item.code).includes("GROUP_OWNER")
                ) {
                    const branches = await BusinessBranch.findAll({
                        where: {
                            businessBaseId: user.businessId,
                        },
                    });

                    allowedBusiness = branches.map(item => item.branchId);
                }

                if (
                    ![user.businessId, ...allowedBusiness].includes(
                        account.businessId
                    )
                ) {
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }
            }

            //--> BLOCK ACCOUNT PRICE
            const pricesToBlock = account.actualBalance?.map(item => item.id);
            await Price.findAll({
                where: {
                    id: pricesToBlock,
                },
                lock: true,
                transaction: t,
            });

            let listPricesToSubstract: Array<SimplePrice> = [];
            for (const batch of batches) {
                const found = listPricesToSubstract.find(
                    item => item.codeCurrency === batch.cost.codeCurrency
                );

                const totalToSubstract = mathOperation(
                    batch.cost.amount,
                    batch.quantity,
                    "multiplication",
                    2
                );

                if (!found) {
                    listPricesToSubstract.push({
                        codeCurrency: batch.cost.codeCurrency,
                        amount: totalToSubstract,
                    });
                } else {
                    listPricesToSubstract = listPricesToSubstract.map(item => {
                        if (item.codeCurrency === batch.cost.codeCurrency) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    totalToSubstract,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                }
            }

            let listOperations = [];
            let listRecordOperations = [];
            if (listPricesToSubstract.length !== 0) {
                for (const price of listPricesToSubstract) {
                    let body: any = {
                        operation: "credit",
                        description: `Extracción por compra de productos. Informe de Recepción de Mercancía del día ${moment(
                            buyedReceipt.createdAt
                        ).format("DD/MM/YYYY")}`,
                        amount: {
                            amount: price.amount * -1,
                            codeCurrency: price.codeCurrency,
                        },
                        accountId: accountId,
                        madeById: user.id,
                        registeredAt: new Date(),
                    };

                    listOperations.push(body);
                    listRecordOperations.push({
                        action: "OPERATION_ADDED",
                        title: getTitleAccountRecord("OPERATION_ADDED"),
                        accountId: accountId,
                        madeById: user.id,
                        details: `Se realizó una nueva operación de extracción por ${price.amount}/${price.codeCurrency} durante el proceso de compra (IRM) de productos.`,
                    });

                    const found = account.actualBalance?.find(
                        item => item.codeCurrency === price.codeCurrency
                    );

                    if (found) {
                        found.amount = mathOperation(
                            found.amount,
                            price.amount,
                            "subtraction",
                            2
                        );
                        await found.save({
                            transaction: t,
                        });
                    } else {
                        const priceBalance = Price.build({
                            amount: price.amount * -1,
                            codeCurrency: price.codeCurrency,
                        });
                        await priceBalance.save({
                            transaction: t,
                        });

                        const balancePrice = AccountBalance.build({
                            accountId: account.id,
                            priceId: priceBalance.id,
                        });
                        await balancePrice.save({
                            transaction: t,
                        });
                    }
                }
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

                await AccountOperation.bulkCreate(updatedTransaction, {
                    updateOnDuplicate: ["noTransaction"],
                    transaction: t,
                });
            }

            if (listRecordOperations.length !== 0) {
                await AccountRecord.bulkCreate(listRecordOperations, {
                    transaction: t,
                });
            }
        }

        await t.commit();

        const to_return = await BuyedReceipt.scope("to_return").findByPk(
            buyedReceipt.id
        );

        res.status(201).json(to_return);
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

export const extractCostsFromBankAccount = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const { accountId } = req.body;
        const user: User = req.user;

        const buyedReceipt = await BuyedReceipt.findByPk(id, {
            include: [
                {
                    model: Batch,
                    include: [
                        { model: Price, as: "grossCost" },
                        { model: Price, as: "netCost" },
                    ],
                },
            ],
        });

        if (!buyedReceipt) {
            t.rollback();
            return res.status(404).json({
                message: `El Informe de Recepción no fue encontrado.`,
            });
        }

        if (buyedReceipt.accountId) {
            t.rollback();
            return res.status(400).json({
                message: `El costo de la mercancía ya fue extraído una cuenta bancaria.`,
            });
        }

        //Substrating amount from account
        //Validations
        const listProductWithNoPrices = buyedReceipt.batches.filter(
            item => !item.grossCost
        );

        if (listProductWithNoPrices.length !== 0) {
            t.rollback();
            return res.status(400).json({
                message: `Hay productos sin precios de costo. Por favor defina un costo antes de continuar.`,
            });
        }

        const account = await Account.findByPk(accountId, {
            include: [
                {
                    model: User,
                    as: "allowedUsers",
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Price,
                    through: {
                        attributes: [],
                    },
                    as: "actualBalance",
                },
            ],
            transaction: t,
        });

        if (!account) {
            t.rollback();
            return res.status(404).json({
                message: `Account not found`,
            });
        }

        if (account.isBlocked) {
            t.rollback();
            return res.status(400).json({
                message: `La cuenta se encuentra bloqueada. Consulte al propietario de la misma.`,
            });
        }

        if (!account.allowMultiCurrency) {
            if (
                buyedReceipt.batches.some(
                    item =>
                        item.grossCost.codeCurrency !== account.definedCurrency
                )
            ) {
                t.rollback();
                return res.status(400).json({
                    message: `La cuenta solo admite operaciones en ${account.definedCurrency}.`,
                });
            }
        }

        //Checking if action belongs to user Business
        if (account.isPrivate) {
            if (
                account.ownerId !== user.id &&
                !account.allowedUsers?.find(item => item.id === user.id) &&
                !user.isSuperAdmin
            ) {
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }
        } else {
            let allowedBusiness: Array<number> = [];
            if (user.roles?.map(item => item.code).includes("GROUP_OWNER")) {
                const branches = await BusinessBranch.findAll({
                    where: {
                        businessBaseId: user.businessId,
                    },
                });

                allowedBusiness = branches.map(item => item.branchId);
            }

            if (
                ![user.businessId, ...allowedBusiness].includes(
                    account.businessId
                )
            ) {
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }
        }

        //--> BLOCK ACCOUNT PRICE
        const pricesToBlock = account.actualBalance?.map(item => item.id);
        await Price.findAll({
            where: {
                id: pricesToBlock,
            },
            lock: true,
            transaction: t,
        });

        let listPricesToSubstract: Array<SimplePrice> = [];
        for (const product of buyedReceipt.batches) {
            const found = listPricesToSubstract.find(
                item => item.codeCurrency === product.netCost.codeCurrency
            );

            const totalToSubstract = mathOperation(
                product.netCost.amount,
                product.entryQuantity,
                "multiplication",
                2
            );

            if (!found) {
                listPricesToSubstract.push({
                    codeCurrency: product.netCost.codeCurrency,
                    amount: totalToSubstract,
                });
            } else {
                listPricesToSubstract = listPricesToSubstract.map(item => {
                    if (item.codeCurrency === product.netCost.codeCurrency) {
                        return {
                            ...item,
                            amount: mathOperation(
                                item.amount,
                                totalToSubstract,
                                "addition",
                                2
                            ),
                        };
                    }
                    return item;
                });
            }
        }

        let listOperations = [];
        let listRecordOperations = [];
        if (listPricesToSubstract.length !== 0) {
            for (const price of listPricesToSubstract) {
                let body: any = {
                    operation: "credit",
                    description: `Extracción por compra de productos. Informe de Recepción de Mercancía del día ${moment(
                        buyedReceipt.createdAt
                    ).format("DD/MM/YYYY")}`,
                    amount: {
                        amount: price.amount * -1,
                        codeCurrency: price.codeCurrency,
                    },
                    accountId: accountId,
                    madeById: user.id,
                    registeredAt: new Date(),
                };

                listOperations.push(body);
                listRecordOperations.push({
                    action: "OPERATION_ADDED",
                    title: getTitleAccountRecord("OPERATION_ADDED"),
                    accountId: accountId,
                    madeById: user.id,
                    details: `Se realizó una nueva operación de extracción por ${price.amount}/${price.codeCurrency} durante el proceso de compra (IRM) de productos.`,
                });

                const found = account.actualBalance?.find(
                    item => item.codeCurrency === price.codeCurrency
                );

                if (found) {
                    found.amount = mathOperation(
                        found.amount,
                        price.amount,
                        "subtraction",
                        2
                    );
                    await found.save({
                        transaction: t,
                    });
                } else {
                    const priceBalance = Price.build({
                        amount: price.amount * -1,
                        codeCurrency: price.codeCurrency,
                    });
                    await priceBalance.save({
                        transaction: t,
                    });

                    const balancePrice = AccountBalance.build({
                        accountId: account.id,
                        priceId: priceBalance.id,
                    });
                    await balancePrice.save({
                        transaction: t,
                    });
                }
            }
        }

        //Registering operations
        if (listOperations.length !== 0) {
            const result = await AccountOperation.bulkCreate(listOperations, {
                include: [{ model: Price, as: "amount" }],
                transaction: t,
                returning: true,
            });

            let updatedTransaction: Array<any> = [];
            for (const item of result) {
                updatedTransaction.push({
                    id: item.id,
                    noTransaction: `T-${item.id}`,
                });
            }

            await AccountOperation.bulkCreate(updatedTransaction, {
                updateOnDuplicate: ["noTransaction"],
                transaction: t,
            });
        }

        if (listRecordOperations.length !== 0) {
            await AccountRecord.bulkCreate(listRecordOperations, {
                transaction: t,
            });
        }

        buyedReceipt.accountId = accountId;
        buyedReceipt.save({ transaction: t });

        await t.commit();

        const to_return = await BuyedReceipt.scope("to_return").findByPk(
            buyedReceipt.id
        );

        res.status(200).json(to_return);
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

export const editBuyedReceipt = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(BuyedReceipt.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt", "businessId"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            return res.status(406).json({ message });
        }

        const moreBusiness = await getAllBranchBusiness(user);

        const buyedReceipt = await BuyedReceipt.findOne({
            where: {
                id,
                businessId: moreBusiness,
            },
        });

        if (!buyedReceipt) {
            return res.status(404).json({
                message: `BuyedReceipt not found`,
            });
        }

        if (["CANCELLED", "DISPATCHED"].includes(buyedReceipt.status)) {
            return res.status(400).json({
                message: `El Informe de recepción no puede ser moficado porque ha sido cerrado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                buyedReceipt[att] = params[att];
            }
        });

        await buyedReceipt.save();

        const to_return = await BuyedReceipt.scope("to_return").findByPk(
            buyedReceipt.id
        );
        res.status(200).json(to_return);
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

export const findAllBuyedReceipt = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, all_data, ...params } =
            req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["status", "createdAt"];

        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_records = await BuyedReceipt.findAndCountAll({
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            attributes: [
                "id",
                "observations",
                "status",
                "totalCost",
                "createdAt",
                "operationNumber",
            ],
            include: [
                {
                    model: Batch,
                    attributes: [
                        "description",
                        "uniqueCode",
                        "expirationAt",
                        "entryQuantity",
                        "noPackages",
                        "measure",
                    ],
                },
                {
                    model: User,
                    as: "createdBy",
                    attributes: ["username", "email", "displayName"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: Area,
                    as: "stockAreaTo",
                    attributes: ["id", "name", "businessId"],
                    include: [
                        {
                            model: Business,
                            attributes: ["id", "name"],
                            paranoid: false,
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: Account,
                    attributes: ["id", "address", "name"],
                    paranoid: false,
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_records.count / limit);
        if (found_records.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_records.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_records.rows,
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

export const getBuyedReceipt = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        let buyedReceipt = await BuyedReceipt.scope("to_return").findByPk(id);

        if (!buyedReceipt) {
            return res.status(404).json({
                message: `BuyedReceipt not found`,
            });
        }

        //Permission Check
        if (buyedReceipt?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        res.status(200).json(buyedReceipt);
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

export const cancelBuyedReceipt = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const buyedReceipt = await BuyedReceipt.findByPk(id);

        if (!buyedReceipt) {
            return res.status(404).json({
                message: `BuyedReceipt not found`,
            });
        }

        //Validations agains business logic
        if (buyedReceipt.dispatchId) {
            return res.status(401).json({
                message: `Este Informe de recepción ya fue despachado y no puede ser borrado.`,
            });
        }

        if (buyedReceipt.accountId) {
            return res.status(401).json({
                message: `El monto de este Informe de recepción modificó el estado de una cuenta bancaria y no puede ser eliminado.`,
            });
        }

        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (
            !moreBusiness.includes(buyedReceipt.businessId) &&
            !user.isSuperAdmin
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        buyedReceipt.status = "CANCELLED";
        await buyedReceipt.save();

        const to_return = await BuyedReceipt.scope("to_return").findByPk(id);

        res.status(200).json(to_return);
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

//Fixed cost
export const newFixedCost = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        //Checking product received
        const buyedReceipt = await BuyedReceipt.findByPk(id);

        if (!buyedReceipt) {
            return res.status(404).json({
                message: `El Informe de recepción introducido no fue encontrada.`,
            });
        }

        if (buyedReceipt.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (["CANCELLED", "DISPATCHED"].includes(buyedReceipt.status)) {
            return res.status(400).json({
                message: `El informe de recepción ha sido cerrado y no puede modificarse.`,
            });
        }

        const fixedCost = BuyedReceiptFixedCost.build({
            ...params,
            productionOrderId: id,
        });

        await fixedCost.save();

        const to_return = await BuyedReceiptFixedCost.scope(
            "to_return"
        ).findByPk(fixedCost.id);

        buyedReceiptQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    buyedReceiptId: id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        res.status(201).json(to_return);
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

export const editFixedCost = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(BuyedReceiptFixedCost.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "productId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            return res.status(406).json({ message });
        }

        const fixedCost = await BuyedReceiptFixedCost.findByPk(id);

        if (!fixedCost) {
            return res.status(404).json({
                message: `El objeto no fue encontrado`,
            });
        }

        //Checking production order permission
        const buyedReceipt = await BuyedReceipt.findByPk(
            fixedCost.buyedReceiptId
        );

        if (!buyedReceipt) {
            return res.status(404).json({
                message: `La orden de producción introducida no fue encontrada.`,
            });
        }

        if (buyedReceipt.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (["CANCELLED", "DISPATCHED"].includes(buyedReceipt.status)) {
            return res.status(400).json({
                message: `El informe de recepción ha sido cerrado y no puede modificarse.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                fixedCost[att] = params[att];
            }
        });

        await fixedCost.save();

        const to_return = await BuyedReceiptFixedCost.scope(
            "to_return"
        ).findByPk(id);

        buyedReceiptQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    buyedReceiptId: buyedReceipt.id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        res.status(200).json(to_return);
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

export const findAllBuyedReceiptFixedCost = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { per_page, page, all_data } = req.query;
        const user: User = req.user;

        //Checking product received
        const buyedReceipt = await BuyedReceipt.findByPk(id);

        if (!buyedReceipt) {
            return res.status(404).json({
                message: `El informe de recepción introducido no fue encontrado.`,
            });
        }

        if (buyedReceipt.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Preparing search
        let where_clause: any = {};

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_records = await BuyedReceiptFixedCost.findAndCountAll({
            distinct: true,
            where: { buyedReceiptId: id, ...where_clause },
            attributes: ["id", "costAmount", "observations"],
            include: [
                {
                    model: FixedCostCategory,
                    attributes: ["id", "name", "description"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
        });

        let totalPages = Math.ceil(found_records.count / limit);
        if (found_records.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_records.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_records.rows,
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

export const deleteFixedCost = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const fixedCost = await BuyedReceiptFixedCost.findByPk(id);

        if (!fixedCost) {
            return res.status(404).json({
                message: `BuyedReceiptFixedCost not found`,
            });
        }

        //Checking product received
        const buyedReceipt = await BuyedReceipt.findByPk(
            fixedCost.buyedReceiptId
        );

        if (!buyedReceipt) {
            return res.status(404).json({
                message: `El producto introducido no fue encontrada.`,
            });
        }

        if (buyedReceipt.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await fixedCost.destroy();

        buyedReceiptQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    buyedReceiptId: buyedReceipt.id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        res.status(200).json({
            message: `Entity deleted successfully`,
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

export const generateADispatch = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const { stockAreaToId } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const buyedReceipt = await BuyedReceipt.findByPk(id, {
            include: [
                {
                    model: Batch,
                    include: [
                        BatchBuyedProduct,
                        {
                            model: Price,
                            as: "netCost",
                        },
                    ],
                },
            ],
        });

        if (!buyedReceipt) {
            t.rollback();
            return res.status(404).json({
                message: `El Informe de Recepción no fue encontrado.`,
            });
        }

        if (buyedReceipt.dispatchId) {
            t.rollback();
            return res.status(400).json({
                message: `Esta compra ya fue despachada.`,
            });
        }

        let stockAreaId = stockAreaToId
            ? stockAreaToId
            : buyedReceipt.stockAreaToId;

        if (!stockAreaId) {
            t.rollback();
            return res.status(400).json({
                message: `No se ha especificado un área de almacenamiento.`,
            });
        }

        //Generals
        const availableCurrencies = await getCurrenciesCache(user.businessId);
        const mainCodeCurrency = availableCurrencies.find(item => item.isMain);
        if (!mainCodeCurrency) {
            t.rollback();
            return res.status(400).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || mainCodeCurrency.currency.code;

        //Obtaining active EconomicCycle
        const activeEconomicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        //FIXME: Temporal while we prepare batch logic. Ignoring them.
        let productsToDispatch: Array<{
            productId: number;
            variationId: number | undefined;
            quantity: number;
            priceUnitaryCost: {
                amount: number;
                codeCurrency: string;
            };
        }> = [];

        for (const batch of buyedReceipt.batches) {
            const found = productsToDispatch.find(
                item => item.productId === batch.productId
            );

            const quantityToSend =
                batch.buyedProducts.find(item => item.status === "RECEIVED")
                    ?.quantity || batch.entryQuantity;

            if (!found) {
                productsToDispatch.push({
                    productId: batch.productId,
                    quantity: quantityToSend,
                    variationId: undefined,
                    priceUnitaryCost: {
                        amount: batch.netCost?.amount || 0,
                        codeCurrency: costCurrency,
                    },
                });
            } else {
                productsToDispatch = productsToDispatch.map(item => {
                    if (item.productId === batch.productId) {
                        item.quantity = mathOperation(
                            item.quantity,
                            quantityToSend,
                            "addition",
                            precission_after_coma
                        );
                    }
                    return item;
                });
            }
        }

        //Obtaining all the products
        const fullProducts = await Product.findAll({
            where: {
                businessId: user.businessId,
            },
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: ProductPrice,
                    attributes: [
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                    ],
                },
                {
                    model: Variation,
                    as: "variations",
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                    ],
                },
            ],
            paranoid: false,
            transaction: t,
        });

        let bulkMovements = [];

        //Creating each product
        let dispatchedProducts = [];
        for (const product of productsToDispatch) {
            const found = fullProducts.find(
                item => item.id === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(400).json({
                    message: `El producto ${product.productId} no fue encontrado.`,
                });
            }

            //Creating all the movement associated
            bulkMovements.push({
                quantity: Math.abs(product.quantity) * -1,
                productId: product.productId,
                variationId: product.variationId,
                description: `Traslado desde compra (IRM)`,
                movedToId: stockAreaToId,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "MOVEMENT",
                economicCycleId: activeEconomicCycle?.id,
            });

            let dispatchProduct: any = {
                name: found.name,
                quantity: product.quantity,
                variationId: product.variationId,
                measure: found.measure,
                universalCode: found.universalCode,
                productId: found.id,
                cost: {
                    amount: product.priceUnitaryCost.amount || 0,
                    codeCurrency: costCurrency,
                },
            };

            const productPrice = getProductPrice(
                found,
                product.variationId,
                availableCurrencies,
                [activeEconomicCycle?.priceSystemId.toString()]
            );

            if (productPrice) {
                dispatchProduct = {
                    ...dispatchProduct,
                    price: {
                        amount: productPrice.amount || 0,
                        codeCurrency:
                            productPrice.codeCurrency ||
                            mainCodeCurrency.currency.code,
                    },
                };
            }
            dispatchedProducts.push(dispatchProduct);
        }

        //Creating dispatch
        const dispatch: Dispatch = Dispatch.build(
            {
                businessId: user.businessId,
                observations: `Despacho originado desde compra (IRM) con fecha ${moment(
                    buyedReceipt.createdAt
                ).format("DD/MM/YY HH:mm")}`,
                status: "CREATED",
                mode: "MOVEMENT",
                createdById: user.id,
                stockAreaToId,
                products: dispatchedProducts,
                economicCycleId: activeEconomicCycle?.id,
            },
            {
                include: [
                    {
                        model: DispatchProduct,
                        as: "products",
                        include: [
                            { model: Price, as: "price" },
                            { model: Price, as: "cost" },
                        ],
                    },
                ],
            }
        );

        await dispatch.save({ transaction: t });

        buyedReceipt.dispatchId = dispatch.id;
        buyedReceipt.status = "DISPATCHED";
        await buyedReceipt.save({ transaction: t });

        //Updating the id of the dispatch in the movements
        bulkMovements = bulkMovements.map(item => {
            return {
                ...item,
                dispatchId: dispatch.id,
            };
        });

        if (bulkMovements.length !== 0) {
            //Creating movements
            await StockMovement.bulkCreate(bulkMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
            });
        }

        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            {
                transaction: t,
            }
        );
        await t.commit();

        res.status(201).json(to_return);

        socketQueue.add(
            {
                code: "NEW_DISPATCH",
                params: {
                    dispatchId: dispatch.id,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: to_return?.products.map(
                        item => item.productId
                    ),
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//About products
export const addaBatchToBuyedReceipt = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const buyedReceipt = await BuyedReceipt.findByPk(id);

        if (!buyedReceipt) {
            t.rollback();
            return res.status(404).json({
                message: `Batch not found`,
            });
        }

        //Checking if action belongs to user Business
        if (buyedReceipt.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (buyedReceipt.dispatchId) {
            t.rollback();
            return res.status(401).json({
                message: `La acción no puede ser procesada. Esta compra tiene un despacho asociado.`,
            });
        }

        const found = await Product.findOne({
            where: {
                id: params.productId,
                businessId: user.businessId,
            },
        });

        if (!found) {
            t.rollback();
            return res.status(404).json({
                message: `Product not found`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);
        const available_currencies = await getCurrenciesCache(user.businessId);
        const main_currency = available_currencies.find(item => item.isMain)!
            .currency.code;
        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || main_currency;

        if (
            !["STOCK", "VARIATION", "RAW", "MANUFACTURED", "ASSET"].includes(
                found.type
            )
        ) {
            t.rollback();
            return res.status(400).json({
                message: `El producto ${found.name} no es de tipo Almacenable. Operación no permitida.`,
            });
        }

        if (found.type === "VARIATION") {
            if (!params.variationId) {
                t.rollback();
                return res.status(400).json({
                    message: `Para el producto ${found.name} no fue introducida una variación válida.`,
                });
            }

            const foundVariation = found.variations.find(
                item => item.id === params.variationId
            );

            if (!foundVariation) {
                t.rollback();
                return res.status(404).json({
                    message: `La variación con id ${params.variationId} del producto ${found.name} no fue encontrada.`,
                });
            }
        }

        let price = { ...params.cost } || {
            amount: 0,
            codeCurrency: costCurrency,
        };
        if (params.cost && params.cost.codeCurrency !== costCurrency) {
            price.amount =
                exchangeCurrency(
                    {
                        amount: params.cost.amount,
                        codeCurrency: params.cost.codeCurrency,
                    },
                    costCurrency,
                    available_currencies
                )?.amount || 0;
            price.codeCurrency = costCurrency;
        }

        let statusWhereReceived = params.buyedProducts || [];
        if (statusWhereReceived.length === 0) {
            statusWhereReceived = [
                {
                    status: "RECEIVED",
                    quantity: params.quantity,
                },
            ];
        }

        const batch = Batch.build({
            uniqueCode: params.uniqueCode,
            grossCost: price,
            netCost: price,
            entryAt: new Date(),
            expirationAt: params.expirationAt,
            entryQuantity: params.quantity,
            availableQuantity: params.quantity,
            productId: found.id,
            universalCode: found.universalCode,
            measure: found.measure,
            variationId: params.variationId,
            noPackages: params.noPackages,
            supplierId: params.supplierId,
            businessId: user.businessId,
            buyedReceiptId: buyedReceipt.id,
            registeredPrice: params.cost || {
                amount: 0,
                codeCurrency: costCurrency,
            },
            buyedProducts: statusWhereReceived,
        });

        await batch.save({ transaction: t });

        await t.commit();

        const to_return = await Batch.scope("to_return").findByPk(batch.id);

        res.status(201).json(to_return);

        buyedReceiptQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    buyedReceiptId: buyedReceipt.id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const deleteBatchFromBuyed = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const batch = await Batch.findByPk(id);

        if (!batch) {
            t.rollback();
            return res.status(404).json({
                message: `Batch not found`,
            });
        }

        if (batch.buyedReceipt?.dispatchId) {
            t.rollback();
            return res.status(401).json({
                message: `La acción no puede ser procesada. Esta compra tiene un despacho asociado.`,
            });
        }

        //Checking if action belongs to user Business
        if (batch.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await batch.destroy({ transaction: t });

        await t.commit();

        res.status(200).json({
            message: `Batch deleted successfully`,
        });

        buyedReceiptQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    buyedReceiptId: batch.buyedReceiptId,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const editBatchFromBuyed = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const { cost: registeredPrice, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const batch = await Batch.findByPk(id, {
            include: [
                {
                    model: Price,
                    as: "grossCost",
                },
                {
                    model: Price,
                    as: "registeredPrice",
                },
                {
                    model: Price,
                    as: "netCost",
                },
            ],
        });

        if (!batch) {
            t.rollback();
            return res.status(404).json({
                message: `Batch not found`,
            });
        }

        if (batch.buyedReceipt?.dispatchId) {
            t.rollback();
            return res.status(401).json({
                message: `La acción no puede ser procesada. Esta compra tiene un despacho asociado.`,
            });
        }

        //Checking if action belongs to user Business
        if (batch.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const paramsKey = Object.keys(params);
        const allowedAttributes = [
            "description",
            "expirationAt",
            "entryQuantity",
            "noPackages",
        ];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                (batch["entryQuantity"] = params["quantity"]),
                    //@ts-ignore
                    (batch[att] = params[att]);
            }
        });

        if (registeredPrice) {
            const configurations = await getBusinessConfigCache(
                user.businessId
            );
            const available_currencies = await getCurrenciesCache(
                user.businessId
            );
            const main_currency = available_currencies.find(
                item => item.isMain
            )!.currency.code;
            const costCurrency =
                configurations.find(
                    item => item.key === "general_cost_currency"
                )?.value || main_currency;

            if (!!batch.registeredPrice) {
                batch.registeredPrice.amount = registeredPrice.amount;
                batch.registeredPrice.codeCurrency =
                    registeredPrice.codeCurrency;
                await batch.registeredPrice.save({ transaction: t });
            } else {
                const newPrice = await Price.create(
                    {
                        amount: registeredPrice.amount,
                        codeCurrency: registeredPrice.codeCurrency,
                    },
                    { transaction: t }
                );
                batch.registeredPriceId = newPrice.id;
            }

            if (registeredPrice.codeCurrency !== costCurrency) {
                const grossCostAmount =
                    exchangeCurrency(
                        {
                            amount: registeredPrice.amount,
                            codeCurrency: registeredPrice.codeCurrency,
                        },
                        costCurrency,
                        available_currencies
                    )?.amount || 0;

                if (!!batch.grossCost) {
                    batch.grossCost.amount = grossCostAmount;
                    await batch.grossCost.save({ transaction: t });
                } else {
                    const newGrossCost = await Price.create(
                        {
                            amount: grossCostAmount,
                            codeCurrency: costCurrency,
                        },
                        { transaction: t }
                    );

                    batch.grossCostId = newGrossCost.id;
                }
            }

            let price = { ...registeredPrice } || {
                amount: 0,
                codeCurrency: costCurrency,
            };

            if (
                registeredPrice &&
                registeredPrice.codeCurrency !== costCurrency
            ) {
                price.amount =
                    exchangeCurrency(
                        {
                            amount: registeredPrice.amount,
                            codeCurrency: registeredPrice.codeCurrency,
                        },
                        costCurrency,
                        available_currencies
                    )?.amount || 0;
                price.codeCurrency = costCurrency;
            }
        }

        await batch.save({ transaction: t });

        const to_return = await Batch.scope("to_return").findByPk(batch.id, {
            transaction: t,
        });

        await t.commit();

        res.status(200).json(to_return);

        buyedReceiptQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    buyedReceiptId: batch.buyedReceiptId,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
    } catch (error: any) {
        await t.rollback();
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
