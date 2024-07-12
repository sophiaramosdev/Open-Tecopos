import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { check } from "express-validator";

import { fieldValidator } from "../../middlewares/fieldValidator";
import AccountTag from "../../database/models/accountTag";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import {
    addAccountToList,
    addUserToAccount,
    currencyExchange,
    deleteAccount,
    deleteAccountFromList,
    deleteAccountList,
    deleteAccountOperation,
    deleteAccountTag,
    deleteUserToAccount,
    editAccount,
    editAccountList,
    editAccountOperation,
    editAccountTag,
    findAllAccountOperations,
    findAllAccountRecords,
    findAllAccountTags,
    getAccountDetails,
    getAccountFinancialReport,
    getAccountOperationDetails,
    getBusinessAccountReportBalance,
    getListAccountBalance,
    getMyAccounts,
    getMyBusinessAccounts,
    getUsersEnableAccount,
    getUsersEnableAccountAdd,
    newAccount,
    newAccountList,
    newAccountOperation,
    newAccountTag,
    transferAccount,
    transferFound,
} from "../../controllers/administration/account";
import Account from "../../database/models/account";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { moduleValidator } from "../../middlewares/moduleValidator";
import AccountList from "../../database/models/accountList";

const routerAccount = Router();

routerAccount.post(
    "/bank/account/",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Account),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(),
        moduleValidator(["ACCOUNTS"]),
    ],
    newAccount
);

routerAccount.patch(
    "/bank/account/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(Account),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    editAccount
);

routerAccount.get(
    "/bank/account",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "MANAGER_CONTABILITY",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        moduleValidator(["ACCOUNTS"]),
    ],
    getMyAccounts
);

routerAccount.get(
    "/bank/business/account",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY", "BUYER"]),
        businessValidator(),
        moduleValidator(["ACCOUNTS"]),
    ],
    getMyBusinessAccounts
);

routerAccount.get(
    "/bank/account/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    getAccountDetails
);

routerAccount.delete(
    "/bank/account/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    deleteAccount
);

routerAccount.post(
    "/bank/tag/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(AccountTag),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    newAccountTag
);
routerAccount.patch(
    "/bank/tag/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(AccountTag),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    editAccountTag
);
routerAccount.get(
    "/bank/tag/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    findAllAccountTags
);

routerAccount.delete(
    "/bank/tag/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    deleteAccountTag
);

routerAccount.get(
    "/bank/account/:id/operation",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    findAllAccountOperations
);

routerAccount.get(
    "/bank/report/balance",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "MANAGER_CONTABILITY",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        moduleValidator(["ACCOUNTS"]),
    ],
    getBusinessAccountReportBalance
);

routerAccount.post(
    "/bank/report/financial",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("dateFrom", "dateFrom field is missing").not().isEmpty(),
        check("dateTo", "dateTo field is missing").not().isEmpty(),
        check("accountIds", "accountIds must be an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    getAccountFinancialReport
);

routerAccount.post(
    "/bank/account/:id/operation",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("amount", "amount field is missing").not().isEmpty(),
        check("amount", "amount must be an object").isObject(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    newAccountOperation
);

routerAccount.patch(
    "/bank/account/operation/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    editAccountOperation
);

routerAccount.post(
    "/bank/transfer/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("amount", "amount field is missing").not().isEmpty(),
        check("amount", "amount must be an object").isObject(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    transferFound
);

routerAccount.post(
    "/bank/currency-exchange/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("amount", "amount field is missing").not().isEmpty(),
        check("toBuyCodeCurrency", "toBuyCodeCurrency field is missing")
            .not()
            .isEmpty(),
        check("exchangeRate", "exchangeRate field is missing").not().isEmpty(),
        check("toSellCodeCurrency", "toSellCodeCurrency field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    currencyExchange
);
routerAccount.get(
    "/bank/operation/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    getAccountOperationDetails
);

routerAccount.delete(
    "/bank/account/:id/operation",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    deleteAccountOperation
);

routerAccount.post(
    "/bank/account/:id/trasfer-account",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("newOwnerId", "newOwnerId field is missing").not().isEmpty(),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
        fieldValidator,
    ],
    transferAccount
);

routerAccount.post(
    "/bank/account/:id/add-user",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("usersIds", "usersIds field is missing")
            .not()
            .isEmpty()
            .isArray(),
        check("id", "id field is missing").not().isEmpty(),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
        fieldValidator,
    ],
    addUserToAccount
);

routerAccount.post(
    "/bank/account/:id/delete-user",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("userId", "userId field is missing").not().isEmpty(),
        check("id", "id field is missing").not().isEmpty(),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
        fieldValidator,
    ],
    deleteUserToAccount
);

routerAccount.get(
    "/bank/account/:id/records",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    findAllAccountRecords
);

routerAccount.get(
    "/bank/account/:id/user-enable-account",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    getUsersEnableAccount
);

routerAccount.get(
    "/bank/account/:id/user-enable-account-add",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    getUsersEnableAccountAdd
);

routerAccount.post(
    "/bank/list",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(AccountList),
        jwtValidator,
        allowedRoles(["OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    newAccountList
);
routerAccount.patch(
    "/bank/list/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(AccountList),
        jwtValidator,
        allowedRoles(["OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    editAccountList
);

routerAccount.delete(
    "/bank/list/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    deleteAccountList
);

routerAccount.post(
    "/bank/list/account/:accountId/:listId",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    addAccountToList
);

routerAccount.delete(
    "/bank/list/account/:accountId/:listId",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(true),
        moduleValidator(["ACCOUNTS"]),
    ],
    deleteAccountFromList
);

routerAccount.get(
    "/bank/report/listbalance",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "MANAGER_CONTABILITY"]),
        businessValidator(),
        moduleValidator(["ACCOUNTS"]),
    ],
    getListAccountBalance
);

export default routerAccount;
