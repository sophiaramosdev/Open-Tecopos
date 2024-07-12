import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Account from "./account";
import Price from "./price";

@Table
export default class AccountBalance extends Model {
    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @ForeignKey(() => Price)
    @Column
    priceId!: number;
}
