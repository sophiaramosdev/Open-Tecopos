import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";

import User from "./user";
import Account from "./account";
import { account_actions_records } from "../../interfaces/nomenclators";

@Table
export default class AccountRecord extends Model {
    @Column
    action!: account_actions_records;

    @Column
    title!: string;

    @Column({
        type: DataType.TEXT,
    })
    details!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    //Relations
    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @BelongsTo(() => Account)
    account!: Account;

    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User, "madeById")
    madeBy?: User;
}
