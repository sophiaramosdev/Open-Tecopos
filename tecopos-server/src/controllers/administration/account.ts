import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";
import moment from "moment";

import User from "../../database/models/user";
import Account from "../../database/models/account";
import { pag_params } from "../../database/pag_params";
import AccountOperation from "../../database/models/accountOperation";
import Image from "../../database/models/image";
import Price from "../../database/models/price";
import AccountRecord from "../../database/models/accountRecord";
import { getTitleAccountRecord } from "../../helpers/translator";
import AccountTag from "../../database/models/accountTag";
import AccountBalance from "../../database/models/accountBalance";
import { config_transactions } from "../../database/seq-transactions";
import Business from "../../database/models/business";
import BusinessBranch from "../../database/models/businessBranch";
import FundDestination from "../../database/models/fundDestination";
import { mathOperation, truncateValue } from "../../helpers/utils";
import Logger from "../../lib/logger";
import { getSummaryAccounts } from "../helpers/reports";
import AllowedAccountUser from "../../database/models/allowedAccountUser";
import Role from "../../database/models/role";
import { getAllBranchBusiness } from "../helpers/utils";
import { getCurrenciesCache } from "../../helpers/redisStructure";
import AccountList from "../../database/models/accountList";
import AccountAccountList from "../../database/models/accountAccountList";

export const newAccount = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { name, description, code, allowMultiCurrency, definedCurrency } =
            req.body;
        const user: User = req.user;

        //Bulding the address
        const amountBusinessAccounts = await Account.count({
            where: {
                businessId: user.businessId,
            },
            transaction: t,
            paranoid: false,
        });

        const address = `${process.env.INIT_ACCOUNT_NUMBER}${user.businessId
            .toString()
            .padStart(4, "0")}${amountBusinessAccounts
            .toString()
            .padStart(4, "0")}`;

        //Check if this number doesn't exist
        const accountCreated = await Account.findOne({
            where: {
                address,
            },
            transaction: t,
        });

        if (accountCreated) {
            t.rollback();
            return res.status(400).json({
                message: `Ha ocurrido un error mientras se asignaba un número de cuenta. Por favor, consulte al administrador.`,
            });
        }

        let optionalParams: any = {};
        if (allowMultiCurrency !== undefined && !allowMultiCurrency) {
            if (!definedCurrency) {
                t.rollback();
                return res.status(400).json({
                    message: `Debe definir un tipo de moneda por defecto.`,
                });
            }

            const availableCurrencies = await getCurrenciesCache(
                user.businessId
            );

            const allowedCodes = availableCurrencies.map(
                item => item.currency.code
            );

            if (!allowedCodes.includes(definedCurrency)) {
                t.rollback();
                return res.status(400).json({
                    message: `La moneda seleccionada no esta disponible en su negocio.`,
                });
            }

            optionalParams = {
                allowMultiCurrency,
                definedCurrency,
            };
        }

        const account: Account = Account.build({
            ownerId: user.id,
            createdById: user.id,
            businessId: user.businessId,
            name,
            description,
            code,
            address,
            ...optionalParams,
        });

        await account.save({ transaction: t });

        //Registering actions
        const record = AccountRecord.build({
            action: "ACCOUNT_CREATED",
            title: getTitleAccountRecord("ACCOUNT_CREATED"),
            accountId: account.id,
            madeById: user.id,
            details: `Se creó la cuenta`,
        });
        await record.save({ transaction: t });

        const to_return = await Account.scope("to_return").findByPk(
            account.id,
            { transaction: t }
        );

        await t.commit();
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

export const editAccount = async (req: any, res: Response) => {
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

        const modelKeys = Object.keys(Account.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "ownerId",
            "createdById",
            "businessId",
            "address",
            "blocked",
        ].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const account = await Account.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "allowedUsers",
                    through: {
                        attributes: [],
                    },
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

        //--> BLOCK ACCOUNT
        await Account.findByPk(id, {
            lock: true,
            transaction: t,
        });

        //Checking if action belongs to user Business
        if (
            account.ownerId !== user.id &&
            !account.allowedUsers?.find(item => item.id === user.id) &&
            !user.isSuperAdmin
        ) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado. Solo los propietarios de la cuenta pueden editarla.`,
            });
        }

        if (
            params.allowMultiCurrency !== undefined &&
            !params.allowMultiCurrency
        ) {
            if (!params.definedCurrency) {
                t.rollback();
                return res.status(400).json({
                    message: `Debe definir un tipo de moneda por defecto.`,
                });
            }

            const availableCurrencies = await getCurrenciesCache(
                user.businessId
            );

            const allowedCodes = availableCurrencies.map(
                item => item.currency.code
            );

            if (!allowedCodes.includes(params.definedCurrency)) {
                t.rollback();
                return res.status(400).json({
                    message: `La moneda seleccionada no esta disponible en su negocio.`,
                });
            }
        }

        const changedProperties: any = [];

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach((att: any) => {
            if (allowedAttributes.includes(att)) {
                changedProperties.push(
                    //@ts-ignore
                    `${att}: ${account[att]} por ${params[att]}`
                );
                //@ts-ignore
                account[att] = params[att];
            }
        });

        await account.save({ transaction: t });

        //Registering actions
        const record = AccountRecord.build({
            action: "ACCOUNT_EDITED",
            title: getTitleAccountRecord("ACCOUNT_EDITED"),
            accountId: account.id,
            madeById: user.id,
            details: `Propiedades modificadas: ${changedProperties.join(", ")}`,
        });
        await record.save({ transaction: t });

        const to_return = await Account.scope("to_return").findByPk(
            account.id,
            { transaction: t }
        );

        await t.commit();
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

export const getMyAccounts = async (req: any, res: Response) => {
    try {
        const { per_page, page, all_data, search, inAllMyBusiness } = req.query;
        const user: User = req.user;
        const business: Business = req.business;

        //Preparing search
        let where_clause: any = {};

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
                where(fn("unaccent", col("name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //@ts-ignore
        const originalBusinessId = user.originalBusinessId;
        let moreBusiness: Array<number> = [user.businessId];
        if (
            business.mode === "GROUP" &&
            user.roles?.map(item => item.code).includes("GROUP_OWNER") &&
            (Number(originalBusinessId) === Number(user.businessId) ||
                inAllMyBusiness)
        ) {
            const branches = await BusinessBranch.findAll({
                where: {
                    businessBaseId: originalBusinessId,
                },
            });

            moreBusiness = [originalBusinessId].concat(
                branches.map(item => item.branchId)
            );
        }

        const found_accounts = await Account.findAll({
            where: {
                businessId: moreBusiness,
                ...where_clause,
            },
            include: [
                {
                    model: User,
                    through: {
                        attributes: [],
                    },
                    as: "allowedUsers",
                },
            ],
        });

        let ids: Array<number> = [];
        for (const account of found_accounts) {
            if (!account.isPrivate || user.isSuperAdmin) {
                ids.push(account.id);
            } else {
                if (
                    account.ownerId === user.id ||
                    account.allowedUsers?.find(item => item.id === user.id)
                ) {
                    ids.push(account.id);
                }
            }
        }

        //Find shared accounts
        const shared_accounts = await Account.findAll({
            where: {
                businessId: {
                    [Op.not]: moreBusiness,
                },
            },
            include: [
                {
                    model: User,
                    through: {
                        attributes: [],
                    },
                    as: "allowedUsers",
                    where: {
                        id: user.id,
                    },
                },
            ],
        });

        ids = ids.concat(shared_accounts.map(item => item.id));

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_accounts_to_return = await Account.findAndCountAll({
            distinct: true,
            where: { id: ids },
            attributes: [
                "id",
                "name",
                "address",
                "code",
                "description",
                "isActive",
                "isBlocked",
                "isPrivate",
                "createdAt",
                "allowMultiCurrency",
                "definedCurrency",
                "businessId",
            ],
            include: [
                {
                    model: Business,
                    attributes: ["id", "name"],
                    include: [
                        {
                            model: Image,
                            as: "logo",
                            attributes: ["src", "thumbnail", "blurHash"],
                        },
                    ],
                },
                {
                    model: User,
                    as: "owner",
                    attributes: ["displayName", "username", "email"],
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
                    model: User,
                    as: "createdBy",
                    attributes: ["displayName", "username", "email"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            order: [["name", "ASC"]],
        });

        let totalPages = Math.ceil(found_accounts_to_return.count / limit);
        if (found_accounts_to_return.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_accounts_to_return.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_accounts_to_return.rows,
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

export const getMyBusinessAccounts = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { per_page, page, all_data, search } = req.query;
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Preparing search
        let where_clause: any = {};

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
                where(fn("unaccent", col("name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Pagination
        const limit = per_page ? Number(per_page) : pag_params.limit;
        const offset = page
            ? (Number(page) - 1) * limit
            : pag_params.offset * limit;

        const found_accounts_to_return = await Account.findAndCountAll({
            where: { businessId: moreBusiness, ...where_clause },
            attributes: ["id", "name", "address", "code"],
            limit: all_data ? undefined : limit,
            order: [["name", "ASC"]],
            offset,
        });

        let totalPages = Math.ceil(found_accounts_to_return.count / limit);
        if (found_accounts_to_return.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_accounts_to_return.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_accounts_to_return.rows,
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

export const deleteAccount = async (req: any, res: Response) => {
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

        const account = await Account.findByPk(id, { transaction: t });

        if (!account) {
            t.rollback();
            return res.status(404).json({
                message: `Account not found`,
            });
        }

        //--> BLOCK ACCOUNT
        await Account.findByPk(id, {
            lock: true,
            transaction: t,
        });

        //Checking if action belongs to user Business
        if (account.ownerId !== user.id) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado. Solos los propietarios de la cuenta pueden eliminarla.`,
            });
        }

        //Delete dependencies
        await FundDestination.destroy({
            where: {
                accountId: account.id,
            },
            transaction: t,
        });

        await account.destroy({ transaction: t });

        //Registering actions
        const record = AccountRecord.build({
            action: "ACCOUNT_DELETED",
            title: getTitleAccountRecord("ACCOUNT_DELETED"),
            accountId: account.id,
            madeById: user.id,
            details: `Se elimino la cuneta`,
        });
        await record.save({ transaction: t });

        await t.commit();
        res.status(200).json({
            message: `Account deleted successfully`,
        });
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

export const getAccountDetails = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(404).json({
                message: `El parámetro id no fue proporcionado.`,
            });
        }

        const account = await Account.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "allowedUsers",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
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

        const to_return = await Account.scope("details").findByPk(account.id);

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

export const getBusinessAccountReportBalance = async (
    req: any,
    res: Response
) => {
    try {
        const user: User = req.user;
        const business: Business = req.business;

        let moreBusiness: Array<number> = [];
        if (
            business.mode === "GROUP" &&
            user.roles?.map(item => item.code).includes("GROUP_OWNER")
        ) {
            const branches = await BusinessBranch.findAll({
                where: {
                    businessBaseId: user.businessId,
                },
            });

            moreBusiness = branches.map(item => item.branchId);
        }

        const found_accounts = await Account.findAll({
            where: {
                businessId: [user.businessId, ...moreBusiness],
            },
            include: [
                {
                    model: User,
                    through: {
                        attributes: [],
                    },
                    as: "allowedUsers",
                },
            ],
        });

        let ids: Array<number> = [];
        for (const account of found_accounts) {
            if (!account.isPrivate || user.isSuperAdmin) {
                ids.push(account.id);
            } else {
                if (
                    account.ownerId === user.id ||
                    account.allowedUsers?.find(item => item.id === user.id)
                ) {
                    ids.push(account.id);
                }
            }
        }

        const accountsBalances = await Account.findAll({
            where: {
                id: ids,
            },
            include: [
                {
                    model: Price,
                    through: {
                        attributes: [],
                    },
                    as: "actualBalance",
                    attributes: ["amount", "codeCurrency"],
                },
            ],
        });

        let listTotalCurrency: Array<{
            codeCurrency: string;
            amount: number;
        }> = [];
        let dataToReturn: Array<{
            accountId: number;
            accountName: string;
            currencies: Array<{
                amount: number;
                codeCurrency: string;
            }>;
        }> = [];

        for (const account of accountsBalances) {
            dataToReturn.push({
                accountName: `${account.name} ${
                    account.code ? account.code : ``
                }`,
                accountId: account.id,
                currencies:
                    account.actualBalance?.map(item => {
                        const found = listTotalCurrency.find(
                            currency =>
                                currency.codeCurrency === item.codeCurrency
                        );

                        if (found) {
                            listTotalCurrency = listTotalCurrency.map(
                                currency => {
                                    if (
                                        currency.codeCurrency ===
                                        item.codeCurrency
                                    ) {
                                        return {
                                            ...currency,
                                            amount:
                                                currency.amount + item.amount,
                                        };
                                    }
                                    return currency;
                                }
                            );
                        } else {
                            listTotalCurrency.push({
                                amount: item.amount,
                                codeCurrency: item.codeCurrency,
                            });
                        }
                        return item;
                    }) || [],
            });
        }

        //Normalizing dataToReturn
        dataToReturn = dataToReturn.map(item => {
            let updatedCurrencies = item.currencies;
            listTotalCurrency.forEach(currency => {
                const found = item.currencies?.find(
                    currencyBalance =>
                        currencyBalance.codeCurrency === currency.codeCurrency
                );

                if (!found) {
                    item.currencies?.push({
                        amount: 0,
                        codeCurrency: currency.codeCurrency,
                    });
                }
            });

            return {
                ...item,
                currencies: updatedCurrencies,
            };
        });

        res.status(200).json(dataToReturn);
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

export const getListAccountBalance = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const foundLists = await AccountList.findAll({
            where: {
                userId: user.id,
            },
            include: [
                {
                    model: Account,
                    as: "accounts",
                    attributes: ["id", "name", "code"],
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        let listAccountInvolved: Array<number> = [];
        for (const list of foundLists) {
            list.accounts?.forEach(item => {
                listAccountInvolved.push(item.id);
            });
        }

        const accountsBalances = await Account.findAll({
            where: {
                id: listAccountInvolved,
            },
            include: [
                {
                    model: Price,
                    through: {
                        attributes: [],
                    },
                    as: "actualBalance",
                    attributes: ["amount", "codeCurrency"],
                },
            ],
        });

        let listTotalCurrency: Array<{
            codeCurrency: string;
            amount: number;
        }> = [];
        let dataToReturn: Array<{
            listId: number;
            listName: string;
            currencies: Array<{
                amount: number;
                codeCurrency: string;
            }>;
            accountList: Array<Partial<Account>>;
        }> = [];

        for (const list of foundLists) {
            let currencies: Array<{
                amount: number;
                codeCurrency: string;
            }> = [];

            for (const account of list.accounts || []) {
                const accountDetails = accountsBalances.find(
                    item => item.id === account.id
                );

                if (!accountDetails) {
                    continue;
                }

                for (const balance of accountDetails.actualBalance || []) {
                    const found = currencies.find(
                        currency =>
                            currency.codeCurrency === balance.codeCurrency
                    );

                    if (found) {
                        currencies = currencies.map(currency => {
                            if (
                                currency.codeCurrency === balance.codeCurrency
                            ) {
                                return {
                                    ...currency,
                                    amount: currency.amount + balance.amount,
                                };
                            }
                            return currency;
                        });
                    } else {
                        currencies.push({
                            amount: balance.amount,
                            codeCurrency: balance.codeCurrency,
                        });
                    }
                }
            }

            dataToReturn.push({
                listName: `${list.name}`,
                listId: list.id,
                currencies,
                accountList: [...(list.accounts || [])],
            });
        }

        //Normalizing dataToReturn
        dataToReturn = dataToReturn.map(item => {
            let updatedCurrencies = item.currencies;
            listTotalCurrency.forEach(currency => {
                const found = item.currencies?.find(
                    currencyBalance =>
                        currencyBalance.codeCurrency === currency.codeCurrency
                );

                if (!found) {
                    item.currencies?.push({
                        amount: 0,
                        codeCurrency: currency.codeCurrency,
                    });
                }
            });

            return {
                ...item,
                currencies: updatedCurrencies,
            };
        });

        res.status(200).json(dataToReturn);
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

export const getAccountFinancialReport = async (req: any, res: Response) => {
    try {
        const { dateFrom, dateTo, accountIds } = req.body;
        const user: User = req.user;

        const accounts = await Account.findAll({
            where: {
                id: accountIds,
            },
            include: [
                {
                    model: User,
                    as: "allowedUsers",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        let allowedBusiness: Array<number> = [];
        if (user.roles?.map(item => item.code).includes("GROUP_OWNER")) {
            const branches = await BusinessBranch.findAll({
                where: {
                    businessBaseId: user.businessId,
                },
            });

            allowedBusiness = branches.map(item => item.branchId);
        }

        for (const account of accounts) {
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
        }

        const dataToReturn = await getSummaryAccounts(
            accountIds,
            dateFrom,
            dateTo
        );

        res.status(200).json(dataToReturn);
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

export const findAllAccountOperations = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { per_page, page, dateFrom, dateTo, all_data, ...params } =
            req.query;
        const user: User = req.user;

        const account = await Account.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "allowedUsers",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
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

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["operation", "madeById", "accountTagId"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["registeredAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (dateFrom) {
                where_clause["registeredAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (dateTo) {
                where_clause["registeredAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_operations = await AccountOperation.findAndCountAll({
            attributes: [
                "id",
                "noTransaction",
                "operation",
                "description",
                "createdAt",
                "accountTagId",
                "registeredAt",
            ],
            distinct: true,
            where: {
                accountId: account.id,
                ...where_clause,
            },
            include: [
                {
                    model: User,
                    as: "madeBy",
                    attributes: ["id", "email", "username", "displayName"],
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
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: AccountTag,
                    attributes: ["id", "name", "code"],
                },
            ],
            offset,
            limit: all_data ? undefined : limit,
            order: [["registeredAt", "DESC"]],
        });

        let totalPages = Math.ceil(found_operations.count / limit);
        if (found_operations.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_operations.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_operations.rows,
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

export const newAccountOperation = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const { operation, description, amount, accountTagId } = req.body;
        const user: User = req.user;

        const account = await Account.findByPk(id, {
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
            if (amount.codeCurrency !== account.definedCurrency) {
                t.rollback();
                return res.status(400).json({
                    message: `La cuenta solo admite operaciones en ${account.definedCurrency}.`,
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

        if (amount.amount === 0) {
            t.rollback();
            return res.status(400).json({
                message: `Los montos de las operaciones no pueden ser cero.`,
            });
        }

        let processedAmount = amount.amount;
        if (operation) {
            if (operation === "debit" && processedAmount < 0) {
                processedAmount = Math.abs(processedAmount);
            }

            if (operation === "credit" && processedAmount > 0) {
                processedAmount = processedAmount * -1;
            }
        }

        const accountOperation: AccountOperation = AccountOperation.build(
            {
                operation: processedAmount > 0 ? "debit" : "credit",
                description,
                amount: {
                    amount: processedAmount,
                    codeCurrency: amount.codeCurrency,
                },
                accountId: account.id,
                madeById: user.id,
                accountTagId,
                registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            },
            {
                include: [{ model: Price, as: "amount" }],
            }
        );
        await accountOperation.save({ transaction: t });
        accountOperation.noTransaction = `T-${accountOperation.id}`;
        await accountOperation.save({ transaction: t });

        let beforeBalance = `0/${accountOperation.amount?.codeCurrency}`;
        let afterBalance = `0/${accountOperation.amount?.codeCurrency}`;

        //Updating actual balance
        if (account.actualBalance) {
            const found = account.actualBalance.find(
                item => item.codeCurrency === amount.codeCurrency
            );

            if (found) {
                beforeBalance = `${found?.amount}/${found?.codeCurrency}`;
                found.amount = mathOperation(
                    found.amount,
                    processedAmount,
                    "addition",
                    2
                );
                await found.save({ transaction: t });
                afterBalance = `${found.amount}/${found.codeCurrency}`;
            } else {
                const priceBalance = Price.build({
                    amount: processedAmount,
                    codeCurrency: amount.codeCurrency,
                });
                await priceBalance.save({ transaction: t });

                const balancePrice = AccountBalance.build({
                    accountId: account.id,
                    priceId: priceBalance.id,
                });
                await balancePrice.save({ transaction: t });
                afterBalance = `${priceBalance.amount}/${priceBalance.codeCurrency}`;
            }
        }

        //Registering actions
        const typeOperation =
            accountOperation.operation === "debit" ? "ingreso" : "gasto";
        const formattedAmount = `${accountOperation.amount?.amount}/${accountOperation.amount?.codeCurrency}`;
        const descOperation = accountOperation.description
            ? `Descripción: ${accountOperation.description}`
            : "";

        let amountBalance = beforeBalance.split("/")[0];
        beforeBalance.split("/")[0] = truncateValue(
            amountBalance,
            2
        ).toString();

        amountBalance = afterBalance.split("/")[0];
        afterBalance.split("/")[0] = truncateValue(amountBalance, 2).toString();

        const record = AccountRecord.build({
            action: "OPERATION_ADDED",
            title: getTitleAccountRecord("OPERATION_ADDED"),
            accountId: account.id,
            madeById: user.id,
            details: `${accountOperation.noTransaction}. Se realizó una nueva operación de ${typeOperation} por ${formattedAmount}, ${descOperation}. Saldo antes: ${beforeBalance}, Saldo después: ${afterBalance}.`,
        });
        await record.save({ transaction: t });

        const to_return = await AccountOperation.scope("to_return").findByPk(
            accountOperation.id,
            { transaction: t }
        );

        await t.commit();
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

export const editAccountOperation = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { description, accountTagId } = req.body;
        const user: User = req.user;

        const accountOperation = await AccountOperation.findByPk(id, {
            include: [{ model: AccountTag }],
            transaction: t,
        });

        if (!accountOperation) {
            t.rollback();
            return res.status(404).json({
                message: `La operación no fue encontrada.`,
            });
        }

        let editedFields = [];
        let newValue: any = [];
        let previousValue: any = [];

        const account = await Account.findByPk(accountOperation.accountId, {
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
        });

        if (!account) {
            t.rollback();
            return res.status(404).json({
                message: `La cuenta asociada a la operación no fue encontrada.`,
            });
        }

        if (account.isBlocked) {
            t.rollback();
            return res.status(400).json({
                message: `La cuenta se encuentra bloqueada. Consulte al propietario de la misma.`,
            });
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

        if (description && accountOperation.description !== description) {
            previousValue.push(accountOperation.description ?? `""`);
            accountOperation.description = description;
            editedFields.push("descripción");
            newValue.push(`"${description}"` ?? `""`);
        }

        if (accountTagId && accountOperation.accountTagId !== accountTagId) {
            const newAccountTag = await AccountTag.findByPk(accountTagId);

            previousValue.push(accountOperation.accountTag?.name);
            accountOperation.accountTagId = accountTagId;
            editedFields.push("concepto");
            newValue.push(newAccountTag?.name ?? "");
        }

        await accountOperation.save({ transaction: t });

        //details
        const detailsArray = editedFields.map(
            (field, index) =>
                `${field}: ${previousValue[index]} por  ${newValue[index]}`
        );
        const details = `${
            accountOperation.noTransaction
        }. Propiedades modificadas: ${detailsArray.join(", ")}`;

        //Registering actions
        const record = AccountRecord.build({
            action: "OPERATION_EDITED",
            title: getTitleAccountRecord("OPERATION_EDITED"),
            accountId: account.id,
            madeById: user.id,
            details,
        });
        await record.save({ transaction: t });

        const toReturn = await AccountOperation.scope("to_return").findByPk(
            accountOperation.id,
            { transaction: t }
        );

        await t.commit();
        res.status(201).json(toReturn);
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

export const transferFound = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const { description, amount, accountTagId, accountToId, address } =
            req.body;
        const user: User = req.user;

        const account = await Account.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "allowedUsers",
                    through: {
                        attributes: [],
                    },
                },
                Business,
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

        //Analyzing if found are enough
        const foundBalance = account.actualBalance?.find(
            item => item.codeCurrency === amount.codeCurrency
        );
        if (!foundBalance) {
            t.rollback();
            return res.status(400).json({
                message: `La cuenta actual no tiene fondos suficientes para completar la operación.`,
            });
        }

        if (
            isNaN(amount.amount) ||
            Number(amount.amount) === 0 ||
            Number(amount.amount) < 0
        ) {
            t.rollback();
            return res.status(400).json({
                message: `El monto introducido para transferir no es correcto.`,
            });
        }

        if (foundBalance.amount < Number(amount.amount)) {
            t.rollback();
            return res.status(400).json({
                message: `La cuenta actual no tiene fondos suficientes para completar la operación.`,
            });
        }

        //Analyzing destination account
        let accountToTransfer;
        if (!accountToId && !address) {
            t.rollback();
            return res.status(400).json({
                message: `No fue encontrada ninguna cuenta de destino. Por favor introduzca una válida.`,
            });
        }

        let typeTransfer;
        if (accountToId) {
            accountToTransfer = await Account.findByPk(accountToId, {
                include: [
                    {
                        model: Price,
                        through: {
                            attributes: [],
                        },
                        as: "actualBalance",
                    },
                    Business,
                ],
                transaction: t,
            });
            typeTransfer = `Transferencia interna desde ${account.name}: ${account.name}- ${account.business.name}`;
        } else if (address) {
            accountToTransfer = await Account.findOne({
                where: {
                    address,
                },
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
            });
            typeTransfer = `Transferencia externa desde ${account.address}: ${account.name}- ${account.business.name}`;
        }

        if (!accountToTransfer) {
            t.rollback();
            return res.status(404).json({
                message: `La cuenta de destino no fue encontrada.`,
            });
        }

        if (accountToTransfer.isBlocked) {
            t.rollback();
            return res.status(404).json({
                message: `La cuenta de destino no puede recibir transferencias.`,
            });
        }

        if (!accountToTransfer.allowMultiCurrency) {
            if (amount.codeCurrency !== accountToTransfer.definedCurrency) {
                t.rollback();
                return res.status(404).json({
                    message: `La cuenta de destino no acepta transferencias en esa moneda.`,
                });
            }
        }

        if (account.id === accountToTransfer.id) {
            t.rollback();
            return res.status(400).json({
                message: `No puede realizar transferencias hacia la misma cuenta bancaria. Por favor, revise su operación.`,
            });
        }

        //--> BLOCK ACCOUNT PRICE
        const pricesToBlock = [
            ...(account.actualBalance?.map(item => item.id) || []),
            ...(accountToTransfer.actualBalance?.map(item => item.id) || []),
        ];
        await Price.findAll({
            where: {
                id: pricesToBlock,
            },
            lock: true,
            transaction: t,
        });

        if (amount.amount === 0) {
            t.rollback();
            return res.status(400).json({
                message: `Los montos de las operaciones no pueden ser cero.`,
            });
        }

        const processedAmount = Math.abs(amount.amount);
        const accountOperationFrom: AccountOperation = AccountOperation.build(
            {
                operation: "credit",
                description: `Transferencia de fondos hacia ${
                    accountToTransfer.name
                } (${accountToTransfer.address}). ${description || ``}`,
                amount: {
                    amount: processedAmount * -1,
                    codeCurrency: amount.codeCurrency,
                },
                accountId: account.id,
                madeById: user.id,
                accountTagId,
                blocked: true,
                registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            },
            {
                include: [{ model: Price, as: "amount" }],
            }
        );

        await accountOperationFrom.save({ transaction: t });
        accountOperationFrom.noTransaction = `T-${accountOperationFrom.id}`;
        await accountOperationFrom.save({ transaction: t });

        const accountOperationTo: AccountOperation = AccountOperation.build(
            {
                operation: "debit",
                description: typeTransfer,
                amount: {
                    amount: processedAmount,
                    codeCurrency: amount.codeCurrency,
                },
                accountId: accountToTransfer.id,
                madeById: user.id,
                blocked: true,
                registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            },
            {
                include: [{ model: Price, as: "amount" }],
            }
        );

        await accountOperationTo.save({ transaction: t });
        accountOperationTo.noTransaction = `T-${accountOperationTo.id}`;
        await accountOperationTo.save({ transaction: t });

        let beforeBalance = `${accountOperationFrom.amount?.amount}/${accountOperationFrom.amount?.codeCurrency}`;
        let afterBalance = `${accountOperationFrom.amount?.amount}/${accountOperationFrom.amount?.codeCurrency}`;
        //Updating actual balance in From account
        if (account.actualBalance) {
            const found = account.actualBalance.find(
                item => item.codeCurrency === amount.codeCurrency
            );

            beforeBalance = `${found?.amount}/${found?.codeCurrency}`;
            if (found) {
                found.amount = mathOperation(
                    found.amount,
                    processedAmount,
                    "subtraction",
                    2
                );
                await found.save({ transaction: t });
                afterBalance = `${found.amount}/${found.codeCurrency}`;
            } else {
                const priceBalance = Price.build({
                    amount: processedAmount,
                    codeCurrency: amount.codeCurrency,
                });
                await priceBalance.save({ transaction: t });

                const balancePrice = AccountBalance.build({
                    accountId: account.id,
                    priceId: priceBalance.id,
                });
                await balancePrice.save({ transaction: t });
                afterBalance = `${priceBalance.amount}/${priceBalance.codeCurrency}`;
            }
        }

        //Updating actual balance in To account
        if (accountToTransfer.actualBalance) {
            const found = accountToTransfer.actualBalance.find(
                item => item.codeCurrency === amount.codeCurrency
            );

            if (found) {
                found.amount = mathOperation(
                    found.amount,
                    processedAmount,
                    "addition",
                    2
                );
                await found.save({ transaction: t });
            } else {
                const priceBalance = Price.build({
                    amount: processedAmount,
                    codeCurrency: amount.codeCurrency,
                });
                await priceBalance.save({ transaction: t });

                const balancePrice = AccountBalance.build({
                    accountId: accountToTransfer.id,
                    priceId: priceBalance.id,
                });
                await balancePrice.save({ transaction: t });
            }
        }

        let amountBalance = beforeBalance.split("/")[0];
        beforeBalance.split("/")[0] = truncateValue(
            amountBalance,
            2
        ).toString();

        amountBalance = afterBalance.split("/")[0];
        afterBalance.split("/")[0] = truncateValue(amountBalance, 2).toString();

        const descTransfer = accountToTransfer.description
            ? `-Descripción: ${accountToTransfer.description}`
            : "";
        const details = `(${accountOperationFrom.noTransaction}/${
            accountOperationTo.noTransaction
        }) Transferencia de fondos:
             - Monto: ${processedAmount}/${amount.codeCurrency}
             - Cuenta de origen: ${account.name} (${account.id})
             - Cuenta de destino: ${
                 accountToTransfer.name || accountToTransfer.address
             } (${accountToTransfer.id})
             - Saldo antes: ${beforeBalance}, Saldo después: ${afterBalance}
             ${descTransfer}`;

        //Registering actions
        const recordFrom = AccountRecord.build({
            action: "OPERATION_ADDED",
            title: getTitleAccountRecord("OPERATION_ADDED"),
            accountId: account.id,
            madeById: user.id,
            details,
        });
        await recordFrom.save({ transaction: t });

        //Registering actions
        const recordTo = AccountRecord.build({
            action: "OPERATION_ADDED",
            title: getTitleAccountRecord("OPERATION_ADDED"),
            accountId: accountToTransfer.id,
            madeById: user.id,
            details,
        });
        await recordTo.save({ transaction: t });

        const to_return = await AccountOperation.scope("to_return").findByPk(
            accountOperationFrom.id,
            { transaction: t }
        );

        await t.commit();
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

export const currencyExchange = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const {
            amount,
            toBuyCodeCurrency,
            exchangeRate,
            toSellCodeCurrency,
            accountToId,
            operation,
        } = req.body;
        const user: User = req.user;

        const account = await Account.findByPk(id, {
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

        //Analyzing destination account
        let accountToTransfer: Account | null = account;
        if (accountToId) {
            accountToTransfer = await Account.findByPk(accountToId, {
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
            });

            if (!accountToTransfer) {
                t.rollback();
                return res.status(404).json({
                    message: `La cuenta de destino no fue encontrada.`,
                });
            }

            if (accountToTransfer.isBlocked) {
                t.rollback();
                return res.status(404).json({
                    message: `La cuenta de destino no puede recibir fondos.`,
                });
            }

            if (!accountToTransfer.allowMultiCurrency) {
                if (toBuyCodeCurrency !== accountToTransfer.definedCurrency) {
                    t.rollback();
                    return res.status(404).json({
                        message: `La cuenta de destino no acepta depósitos en esa moneda.`,
                    });
                }
            }

            //--> BLOCK ACCOUNT PRICE
            await Price.findAll({
                where: {
                    id:
                        accountToTransfer.actualBalance?.map(item => item.id) ||
                        [],
                },
                lock: true,
                transaction: t,
            });
        }

        //--> BLOCK ACCOUNT PRICE
        const pricesToBlock = [
            ...(account.actualBalance?.map(item => item.id) || []),
        ];
        await Price.findAll({
            where: {
                id: pricesToBlock,
            },
            lock: true,
            transaction: t,
        });

        let amountToDeposit = 0;
        let amountToExtract = 0;

        if (operation === "sell") {
            amountToDeposit = mathOperation(
                exchangeRate,
                amount,
                "multiplication",
                2
            );

            amountToExtract = amount;
        } else {
            amountToDeposit = amount;

            amountToExtract = mathOperation(
                exchangeRate,
                amount,
                "multiplication",
                2
            );
        }

        if (!account.allowMultiCurrency) {
            if (toSellCodeCurrency !== account.definedCurrency) {
                t.rollback();
                return res.status(404).json({
                    message: `La cuenta actual no acepta extracciones en esa moneda.`,
                });
            }
        }

        //Analyzing if found are enough
        const foundBalance = account.actualBalance?.find(
            item => item.codeCurrency === toSellCodeCurrency
        );
        if (!foundBalance) {
            t.rollback();
            return res.status(400).json({
                message: `La cuenta actual no tiene fondos suficientes para completar la operación.`,
            });
        }

        if (
            isNaN(amountToDeposit) ||
            Number(amountToDeposit) === 0 ||
            Number(amountToDeposit) < 0
        ) {
            t.rollback();
            return res.status(400).json({
                message: `El monto introducido para comprar no es correcto.`,
            });
        }

        if (
            isNaN(amountToExtract) ||
            Number(amountToExtract) === 0 ||
            Number(amountToExtract) < 0
        ) {
            t.rollback();
            return res.status(400).json({
                message: `El monto introducido para vender no es correcto.`,
            });
        }

        if (isNaN(exchangeRate) || Number(exchangeRate) === 0) {
            t.rollback();
            return res.status(400).json({
                message: `La tasa de cambio introducida no es correcta.`,
            });
        }

        if (foundBalance.amount < amountToExtract) {
            t.rollback();
            return res.status(400).json({
                message: `La cuenta actual no tiene fondos suficientes para completar la operación.`,
            });
        }

        let exchangeText = ``;
        if (operation === "sell") {
            exchangeText = `Tasa de cambio 1 ${toSellCodeCurrency} = ${exchangeRate} ${toBuyCodeCurrency}.`;
        } else {
            exchangeText = `Tasa de cambio 1 ${toBuyCodeCurrency} = ${exchangeRate} ${toSellCodeCurrency}.`;
        }

        const accountOperationFrom: AccountOperation = AccountOperation.build(
            {
                operation: "credit",
                description: `Cambio de moneda. Venta de ${toSellCodeCurrency}. ${exchangeText}`,
                amount: {
                    amount: Math.abs(amountToExtract) * -1,
                    codeCurrency: toSellCodeCurrency,
                },
                accountId: account.id,
                madeById: user.id,
                registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            },
            {
                include: [{ model: Price, as: "amount" }],
            }
        );

        await accountOperationFrom.save({ transaction: t });

        const accountOperationTo: AccountOperation = AccountOperation.build(
            {
                operation: "debit",
                description: `Cambio de moneda. Compra de ${toBuyCodeCurrency}. ${exchangeText}`,
                amount: {
                    amount: Math.abs(amountToDeposit),
                    codeCurrency: toBuyCodeCurrency,
                },
                accountId: accountToId || account.id,
                madeById: user.id,
                registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            },
            {
                include: [{ model: Price, as: "amount" }],
            }
        );

        await accountOperationTo.save({ transaction: t });

        //Updating actual balance in From account
        if (account.actualBalance) {
            const found = account.actualBalance.find(
                item => item.codeCurrency === toSellCodeCurrency
            );

            if (found) {
                found.amount = mathOperation(
                    found.amount,
                    amountToExtract,
                    "subtraction",
                    2
                );
                await found.save({ transaction: t });
            } else {
                const priceBalance = Price.build({
                    amount: amountToExtract,
                    codeCurrency: toSellCodeCurrency,
                });
                await priceBalance.save({ transaction: t });

                const balancePrice = AccountBalance.build({
                    accountId: account.id,
                    priceId: priceBalance.id,
                });
                await balancePrice.save({ transaction: t });
            }
        }

        //Updating actual balance in To account
        if (accountToTransfer.actualBalance) {
            const found = accountToTransfer.actualBalance.find(
                item => item.codeCurrency === toBuyCodeCurrency
            );

            if (found) {
                found.amount = mathOperation(
                    found.amount,
                    amountToDeposit,
                    "addition",
                    2
                );
                await found.save({ transaction: t });
            } else {
                const priceBalance = Price.build({
                    amount: amountToDeposit,
                    codeCurrency: toBuyCodeCurrency,
                });
                await priceBalance.save({ transaction: t });

                const balancePrice = AccountBalance.build({
                    accountId: accountToTransfer.id,
                    priceId: priceBalance.id,
                });
                await balancePrice.save({ transaction: t });
            }
        }

        //Registering actions
        const recordFrom = AccountRecord.build({
            action: "CURRENCY_EXCHANGE",
            title: getTitleAccountRecord("CURRENCY_EXCHANGE"),
            accountId: account.id,
            madeById: user.id,
            observations: `Cambio de moneda. Venta de ${toSellCodeCurrency}. Tasa de cambio 1 ${toBuyCodeCurrency} = ${exchangeRate} ${toSellCodeCurrency}.`,
        });
        await recordFrom.save({ transaction: t });

        //Registering actions
        const recordTo = AccountRecord.build({
            action: "CURRENCY_EXCHANGE",
            title: getTitleAccountRecord("CURRENCY_EXCHANGE"),
            accountId: accountToTransfer.id,
            madeById: user.id,
            observations: `Cambio de moneda. Compra de ${toBuyCodeCurrency}. Tasa de cambio 1 ${toBuyCodeCurrency} = ${exchangeRate} ${toSellCodeCurrency}.`,
        });
        await recordTo.save({ transaction: t });

        const selled = await AccountOperation.scope("to_return").findByPk(
            accountOperationFrom.id,
            { transaction: t }
        );
        const buyed = await AccountOperation.scope("to_return").findByPk(
            accountOperationTo.id,
            { transaction: t }
        );

        const to_return = [selled];
        if (!accountToId) {
            to_return.push(buyed);
        }

        await t.commit();
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

export const deleteAccountOperation = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const user: User = req.user;

        const accountOperation = await AccountOperation.findByPk(id, {
            include: [Price],
            transaction: t,
        });

        if (!accountOperation) {
            t.rollback();
            return res.status(404).json({
                message: `accountOperation not found`,
            });
        }

        if (accountOperation.blocked) {
            t.rollback();
            return res.status(404).json({
                message: `La operación seleccionada no puede ser eliminada.`,
            });
        }

        const account = await Account.findByPk(accountOperation.accountId, {
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

        //--> BLOCK ACCOUNT PRICE
        const pricesToBlock = account.actualBalance?.map(item => item.id);
        await Price.findAll({
            where: {
                id: pricesToBlock,
            },
            lock: true,
            transaction: t,
        });

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

        const atMiddleNigth = moment(accountOperation.createdAt).endOf("day");
        if (moment(new Date()).isAfter(atMiddleNigth)) {
            t.rollback();
            return res.status(400).json({
                message: `Solo puede eliminar operaciones realizadas en el día.`,
            });
        }

        let beforeBalance;
        let afterBalance;

        //Updating actual balance
        if (account.actualBalance) {
            const found = account.actualBalance.find(
                item =>
                    item.codeCurrency === accountOperation.amount!.codeCurrency
            );

            beforeBalance = `${found?.amount}/${found?.codeCurrency}`;

            if (found) {
                found.amount = mathOperation(
                    found.amount,
                    accountOperation.amount!.amount,
                    "subtraction",
                    2
                );
                await found.save({ transaction: t });
                afterBalance = `${found.amount}/${found.codeCurrency}`;
            } else {
                const priceBalance = Price.build({
                    amount: accountOperation.amount!.amount,
                    codeCurrency: accountOperation.amount!.codeCurrency,
                });
                await priceBalance.save({ transaction: t });

                const balancePrice = AccountBalance.build({
                    accountId: account.id,
                    priceId: priceBalance.id,
                });
                await balancePrice.save({ transaction: t });
                afterBalance = `${priceBalance.amount}/${priceBalance.codeCurrency}`;
            }
        }

        //Registering actions
        const descOperation = accountOperation.description
            ? `Descripción: ${accountOperation.description}`
            : "";
        const record = AccountRecord.build({
            action: "OPERATION_DELETED",
            title: getTitleAccountRecord("OPERATION_DELETED"),
            details: `${
                accountOperation.noTransaction
            }. Valores eliminados: Monto - ${accountOperation.amount!.amount} ${
                accountOperation.amount?.codeCurrency
            }, Operación: ${
                accountOperation.operation
            }, ${descOperation}. Saldo antes: ${
                beforeBalance ?? ""
            }, Saldo después: ${afterBalance}`,
            accountId: account.id,
            madeById: user.id,
        });
        await record.save({ transaction: t });

        await accountOperation.destroy({ transaction: t });

        await t.commit();
        res.status(204).json({});
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

export const getAccountOperationDetails = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const user: User = req.user;

        const accountOperation = await AccountOperation.scope(
            "details"
        ).findByPk(id);

        if (!accountOperation) {
            t.rollback();
            return res.status(404).json({
                message: `accountOperation not found`,
            });
        }

        const account = await Account.findByPk(accountOperation.accountId, {
            include: [
                {
                    model: User,
                    as: "allowedUsers",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!account) {
            t.rollback();
            return res.status(404).json({
                message: `Account not found`,
            });
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

        res.status(200).json(accountOperation);
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

//Account Tags
export const newAccountTag = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { name, code } = req.body;
        const user: User = req.user;

        const account = await Account.findByPk(id, {
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
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
        }

        if (account.isBlocked) {
            return res.status(400).json({
                message: `La cuenta se encuentra bloqueada. Consulte al propietario de la misma.`,
            });
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

        const tag: AccountTag = AccountTag.build({
            accountId: account.id,
            name,
            code,
        });

        await tag.save();

        const to_return = await AccountTag.scope("to_return").findByPk(tag.id);

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

export const editAccountTag = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { name, code } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const accountTag = await AccountTag.findByPk(id);

        if (!accountTag) {
            return res.status(404).json({
                message: `AccountTag not found`,
            });
        }

        const account = await Account.findByPk(accountTag.accountId, {
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
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
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

        if (name) accountTag.name = name;
        if (code) accountTag.code = code;

        await accountTag.save();

        const to_return = await AccountTag.scope("to_return").findByPk(
            accountTag.id
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

export const findAllAccountTags = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data } = req.query;
        const user: User = req.user;

        const { id } = req.params;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const account = await Account.findByPk(id, {
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
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
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

        //Preparing search
        let where_clause: any = {};

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
                where(fn("unaccent", col("name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["name", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_account_tags = await AccountTag.findAndCountAll({
            attributes: ["id", "name", "code"],
            distinct: true,
            where: { accountId: account.id, ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_account_tags.count / limit);
        if (found_account_tags.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_account_tags.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_account_tags.rows,
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

export const deleteAccountTag = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const accountTag = await AccountTag.findByPk(id);

        if (!accountTag) {
            return res.status(404).json({
                message: `AccountTag not found`,
            });
        }

        const account = await Account.findByPk(accountTag.accountId, {
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
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
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

        await accountTag.destroy();

        res.status(200).json({
            message: `AccountTag deleted successfully`,
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

export const transferAccount = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { id } = req.params;
        const { newOwnerId } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const account = await Account.findByPk(id, { transaction: t });

        if (!account) {
            t.rollback();
            return res.status(404).json({
                message: `Account not found`,
            });
        }

        //Checking if action belongs to user Business
        if (account.ownerId !== user.id) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado. Solos los propietarios de la cuenta pueden transferirla.`,
            });
        }

        const newOwner = await User.findByPk(newOwnerId, {
            include: [{ model: Role, attributes: ["code"] }],
            transaction: t,
        });

        if (!newOwner) {
            t.rollback();
            return res.status(404).json({
                message: `No se a encontrado al usuario a transferir la cuenta `,
            });
        }

        if (newOwnerId === user.id) {
            t.rollback();
            return res.status(404).json({
                message: `Usted ya es el dueño de la cuenta. `,
            });
        }

        const userRoleCodes = newOwner.roles?.map(item => item.code) || [];
        const rolesToCheck = ["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"];

        if (!userRoleCodes.some(roleCode => rolesToCheck.includes(roleCode))) {
            t.rollback();
            return res.status(404).json({
                message: `El usuario no tiene permitido tener una cuenta verifique su rol  `,
            });
        }

        //--> BLOCK ACCOUNT
        await Account.findByPk(id, {
            lock: true,
            transaction: t,
        });

        const exitsPreviosAllowUserAccount = await AllowedAccountUser.findOne({
            where: {
                accountId: account.id,
                userId: newOwner.id,
            },
        });

        if (exitsPreviosAllowUserAccount) {
            await exitsPreviosAllowUserAccount.destroy({ transaction: t });
        }

        const record = AccountRecord.build({
            action: "ACCOUNT_TRANSFERRED",
            title: getTitleAccountRecord("ACCOUNT_TRANSFERRED"),
            details: `Cuenta transferida a ${newOwner.username}/${newOwner.email}`,
            accountId: account.id,
            madeById: user.id,
        });
        await record.save({ transaction: t });

        await account.update({ ownerId: newOwnerId }, { transaction: t });

        t.commit();

        return res.json({
            message: `Account transferred successfully`,
        });
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

export const addUserToAccount = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const { id } = req.params;
        const { usersIds }: { usersIds: number[] } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const account = await Account.findByPk(id, {
            include: [
                {
                    model: User,
                    through: {
                        attributes: [],
                    },
                    as: "allowedUsers",
                    attributes: ["id", "displayName", "username", "email"],
                },
            ],
            transaction: t,
        });

        if (!account) {
            t.rollback();
            return res.status(404).json({
                message: `Account not found or user not exits`,
            });
        }

        if (account.ownerId !== user.id) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado. Solos los propietarios de la cuenta pueden agregar más usuarios a la cuenta.`,
            });
        }

        const isOwner = usersIds.find(user => user === account.ownerId);

        if (isOwner) {
            t.rollback();
            return res.status(400).json({
                message: `Usted ya es el dueño de la cuenta.`,
            });
        }

        const newUsersToAdd = await User.findAll({
            where: {
                id: usersIds,
            },
            attributes: ["id", "username", "email", "displayName"],
            include: [{ model: Role, attributes: ["code"] }],
            transaction: t,
        });

        if (newUsersToAdd.length === 0) {
            t.rollback();
            return res.status(404).json({
                message: `No se a encontrado ningún usuario.`,
            });
        }

        //Check rol the users
        const rolesToCheck = ["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"];
        for (const user of newUsersToAdd) {
            const userRoleCodes = user.roles?.map(item => item.code) || [];

            if (
                !userRoleCodes.some(roleCode => rolesToCheck.includes(roleCode))
            ) {
                return res.status(400).json({
                    message: `El usuario ${user.username} no tiene permitido tener acceso a una cuenta. Verifique su rol.`,
                });
            }
        }

        const found = account.allowedUsers?.find(item => item.id === user.id);

        if (found) {
            t.rollback();
            return res.status(400).json({
                message: `El usuario  ${found?.username} ya tiene acceso a la cuenta.`,
            });
        }

        //Add user to account
        await AllowedAccountUser.bulkCreate(
            newUsersToAdd.map(user => ({
                accountId: account.id,
                userId: user.id,
            })),
            { transaction: t }
        );

        await AccountRecord.bulkCreate(
            newUsersToAdd.map(userDb => ({
                action: "ADD_USER_TO_ACCOUNT",
                title: getTitleAccountRecord("ADD_USER_TO_ACCOUNT"),
                details: `Se le otorgó acceso a la cuenta al usuario ${userDb.username}/${userDb.email}`,
                accountId: account.id,
                madeById: user.id,
            })),
            { transaction: t }
        );

        t.commit();
        return res.status(200).json(newUsersToAdd);
    } catch (error: any) {
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteUserToAccount = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const account = await Account.findByPk(id, {
            transaction: t,
        });

        const userDb = await User.findByPk(userId, {
            include: [{ model: Role, attributes: ["code"] }],
            transaction: t,
        });

        if (!account || !userDb) {
            t.rollback();
            return res.status(404).json({
                message: `Account not found or user not exits`,
            });
        }

        //Checking if action belongs to user Business
        if (account.ownerId !== user.id) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado. Solos los propietarios de la cuenta pueden quitar el acceso a la cuenta .`,
            });
        }

        if (account.ownerId === +userId) {
            t.rollback();
            return res.status(400).json({
                message: `Usted es el dueño de la cuenta.`,
            });
        }

        const userExist = await AllowedAccountUser.findOne({
            where: {
                accountId: account.id,
                userId: userId,
            },
            transaction: t,
        });

        if (!userExist) {
            t.rollback();
            return res.status(404).json({
                message: `El usuario no tiene acceso a la cuenta.`,
            });
        }

        // Destroy user
        await AllowedAccountUser.destroy({
            where: {
                accountId: account.id,
                userId: userId,
            },
            transaction: t,
        });

        const record = AccountRecord.build({
            action: "DELETE_USER_TO_ACCOUNT",
            title: getTitleAccountRecord("DELETE_USER_TO_ACCOUNT"),
            details: `Se le eliminó el acceso de la cuenta a ${userDb.username}/${userDb.email}`,
            accountId: account.id,
            madeById: user.id,
        });
        await record.save({ transaction: t });

        t.commit();
        return res.status(200).json({
            message: "Operación completada.",
        });
    } catch (error) {
        t.rollback();
        console.error("Error al agregar usuario a la cuenta:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const findAllAccountRecords = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { per_page, page, dateFrom, dateTo, action } = req.query;
        const user: User = req.user;

        const account = await Account.findByPk(id);

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
        }

        if (account.ownerId !== user.id && !user.isSuperAdmin) {
            return res.status(403).json({
                message: `Solo el propietario de la cuenta puede ver las trazas.`,
            });
        }

        //Preparing search
        let where_clause: any = {};

        //Date filtering
        if (dateFrom && dateTo) {
            //case  between dates
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

        if (action) {
            where_clause["action"] = {
                [Op.like]: action,
            };
        }

        // pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_operations = await AccountRecord.findAndCountAll({
            distinct: true,
            where: {
                accountId: account.id,
                ...where_clause,
            },
            include: [
                {
                    model: User,
                    as: "madeBy",
                    attributes: ["id", "email", "username", "displayName"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
            ],
            offset,
            limit,
            order: [["createdAt", "DESC"]],
        });

        let totalPages = Math.ceil(found_operations.count / limit);
        if (found_operations.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_operations.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: totalPages,
            items: found_operations.rows,
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

export const getUsersEnableAccount = async (req: any, res: Response) => {
    const user = req.user;
    const business = req.business;
    const { search } = req.query;

    try {
        let where_clause: any = {};

        //search for displayName
        if (search) {
            where_clause["displayName"] = {
                [Op.iLike]: `%${search}%`,
            };
        }

        const usersBuisness = await User.findAll({
            attributes: ["id", "username", "displayName"],
            where: {
                businessId: business.id,
                id: {
                    [Op.not]: user.id, // Exclude user
                },
                ...where_clause,
            },
            include: [
                {
                    model: Role,
                    attributes: ["code"],
                    where: {
                        code: ["OWNER", "MANAGER_CONTABILITY", "GROUP_OWNER"],
                    },
                },
            ],
        });

        return res.json(usersBuisness);
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

export const getUsersEnableAccountAdd = async (req: any, res: Response) => {
    const user = req.user;
    const business = req.business;
    const { id } = req.params;
    const { search } = req.query;

    try {
        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        let where_clause: any = {};

        //search for displayName
        if (search) {
            where_clause["displayName"] = {
                [Op.iLike]: `%${search}%`,
            };
        }

        const account = await Account.findByPk(id, {
            include: [
                {
                    model: User,
                    through: {
                        attributes: [],
                    },
                    as: "allowedUsers",
                    attributes: ["id", "displayName", "username", "email"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                },
            ],
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
        }

        const userWithAccess = account.allowedUsers?.map(user => user.id);

        const usersBuisness = await User.findAll({
            attributes: ["id", "username", "displayName"],
            where: {
                businessId: business.id,
                id: {
                    [Op.not]: [user.id, ...(userWithAccess || [])], // Exclude user and user with access
                },
                ...where_clause,
            },
            include: [
                {
                    model: Role,
                    attributes: ["code"],
                    where: {
                        code: ["OWNER", "MANAGER_CONTABILITY", "GROUP_OWNER"],
                    },
                },
            ],
        });

        return res.json(usersBuisness);
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

//List
export const newAccountList = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        const accountList: AccountList = AccountList.build({
            userId: user.id,
            ...params,
        });

        await accountList.save();

        const to_return = await AccountList.scope("to_return").findByPk(
            accountList.id
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

export const editAccountList = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(AccountList.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt", "userId"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const accountList = await AccountList.findOne({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!accountList) {
            return res.status(404).json({
                message: `AccountList not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                accountList[att] = params[att];
            }
        });

        await accountList.save();

        const to_return = await AccountList.scope("to_return").findByPk(
            accountList.id
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
export const deleteAccountList = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const accountList = await AccountList.findByPk(id);

        if (!accountList) {
            return res.status(404).json({
                message: `AccountList not found`,
            });
        }

        //Checking if action belongs to user Business
        if (accountList.userId !== user.id) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await accountList.destroy();

        res.status(200).json({
            message: `Operation completed successfully`,
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

export const addAccountToList = async (req: any, res: Response) => {
    try {
        const { listId, accountId } = req.params;
        const user: User = req.user;

        if (!listId) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const accountList = await AccountList.findByPk(listId);

        if (!accountList) {
            return res.status(404).json({
                message: `AccountList not found`,
            });
        }

        //Checking if action belongs to user Business
        if (accountList.userId !== user.id) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
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
            ],
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
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

        //Check if this number doesn't exist
        const relationAccount = AccountAccountList.build({
            accountId,
            accountListId: accountList.id,
        });

        await relationAccount.save();

        const accountResponse = await AccountList.scope("to_return").findByPk(
            listId
        );

        res.status(200).json(accountResponse);
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

export const deleteAccountFromList = async (req: any, res: Response) => {
    try {
        const { listId, accountId } = req.params;
        const user: User = req.user;

        if (!listId) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const accountList = await AccountList.findByPk(listId);

        if (!accountList) {
            return res.status(404).json({
                message: `AccountList not found`,
            });
        }

        //Checking if action belongs to user Business
        if (accountList.userId !== user.id) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
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
            ],
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
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

        //Check if this number doesn't exist
        const relationAccount = await AccountAccountList.findOne({
            where: {
                accountId,
                accountListId: accountList.id,
            },
        });

        if (relationAccount) {
            await relationAccount.destroy();
        }

        const accountResponse = await AccountList.scope("to_return").findByPk(
            listId
        );

        res.status(200).json(accountResponse);
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
