import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import User from "./user";
import Account from "./account";

@Table
export default class AllowedAccountUser extends Model {
    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @ForeignKey(() => User)
    @Column
    userId!: number;
}
