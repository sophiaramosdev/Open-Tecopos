import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Account from "./account";
import AccountList from "./accountList";

@Table
export default class AccountAccountList extends Model {
    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @ForeignKey(() => AccountList)
    @Column
    accountListId!: number;
}
