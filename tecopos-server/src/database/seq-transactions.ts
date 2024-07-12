import { Transaction } from "sequelize";

export const config_transactions = {
    isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    retry: {
        max: 4,
        timeout: 3500,
    },
};
