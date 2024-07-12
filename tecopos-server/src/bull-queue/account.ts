import Queue from "bull";
import { Op, where, fn, col } from "sequelize";

import { JobAccountData } from "./interfaces";
import Logger from "../lib/logger";
import Price from "../database/models/price";
import Account from "../database/models/account";
import AccountOperation from "../database/models/accountOperation";
import { formatCurrency, mathOperation } from "../helpers/utils";

export const accountQueue = new Queue(
    `account-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
accountQueue.process(async (job: Queue.Job<JobAccountData>, done) => {
    try {
        switch (job.data.code) {
            case "DAILY_BALANCE":
                {
                    const { accountId, init, end } = job.data.params;

                    try {
                        const account = await Account.findByPk(accountId, {
                            include: [
                                {
                                    model: Price,
                                    through: {
                                        attributes: [],
                                    },
                                    as: "actualBalance",
                                },
                                {
                                    model: AccountOperation,
                                    include: [Price],
                                    where: {
                                        registeredAt: {
                                            [Op.between]: [init, end],
                                        },
                                    },
                                },
                            ],
                        });

                        if (!account) {
                            done();
                            return;
                        }

                        if (account.operations.length === 0) {
                            done();
                            return;
                        }

                        let totalBalance: Array<{
                            amount: number;
                            codeCurrency: string;
                        }> = [];

                        for (const operation of account.operations) {
                            if (!operation.amount) {
                                continue;
                            }

                            const found = totalBalance.find(
                                item =>
                                    item.codeCurrency ===
                                    operation.amount?.codeCurrency
                            );

                            if (found) {
                                totalBalance = totalBalance.map(element => {
                                    if (
                                        element.codeCurrency ===
                                        operation.amount?.codeCurrency
                                    ) {
                                        return {
                                            ...element,
                                            amount: mathOperation(
                                                element.amount,
                                                operation.amount?.amount,
                                                "addition",
                                                2
                                            ),
                                        };
                                    }

                                    return element;
                                });
                            } else {
                                totalBalance.push({
                                    amount: operation.amount.amount,
                                    codeCurrency: operation.amount.codeCurrency,
                                });
                            }
                        }

                        let listAccountOperations = [];
                        for (const balance of totalBalance) {
                            if (balance.amount === 0) {
                                continue;
                            }

                            const foundCurrencyBalance =
                                account.actualBalance?.find(
                                    item =>
                                        item.codeCurrency ===
                                        balance.codeCurrency
                                );

                            listAccountOperations.push({
                                operation: "balance",
                                description: `Balance al finalizar el día: ${formatCurrency(
                                    foundCurrencyBalance?.amount || 0,
                                    foundCurrencyBalance?.codeCurrency
                                )}`,
                                amount: {
                                    amount: balance.amount,
                                    codeCurrency: balance.codeCurrency,
                                },
                                accountId,
                                madeById: 1,
                                registeredAt: end,
                                blocked: true,
                            });
                        }

                        if (listAccountOperations.length !== 0) {
                            await AccountOperation.bulkCreate(
                                listAccountOperations,
                                {
                                    include: [{ model: Price, as: "amount" }],
                                }
                            );
                        }
                    } catch (error: any) {
                        Logger.error(
                            error.toString() ||
                                "Ha ocurrido un error inesperado.",
                            {
                                origin: "accountQueue/CHECK_PEOPLE_IN_BUSINESS",
                            }
                        );
                    } finally {
                        done();
                    }
                }
                break;
        }
    } catch (error: any) {
        Logger.error(error);
        done(new Error(error.toString()));
    }
});
