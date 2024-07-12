import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    HasMany,
    DeletedAt,
    Scopes,
} from "sequelize-typescript";

import Account from "./account";
import AccountOperation from "./accountOperation";
import Area from "./area";
import FundDestination from "./fundDestination";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "code"],
    },
}))
export default class AccountTag extends Model {
    @Column
    name!: string;

    @Column
    code!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @BelongsTo(() => Account)
    account!: Account;

    @HasMany(() => AccountOperation)
    operations!: AccountOperation[];

    @HasMany(() => FundDestination)
    fundDestinations!: FundDestination[];

    @HasMany(() => Area)
    areas!: Area[];
}
