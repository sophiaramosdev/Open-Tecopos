import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
    Scopes,
} from "sequelize-typescript";
import Area from "./area";
import Account from "./account";
import AccountTag from "./accountTag";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "codeCurrency", "paymentWay", "default"],
        include: [
            {
                model: Area,
                attributes: ["id", "name", "code"],
            },
            {
                model: Account,
                attributes: ["id", "name", "code"],
            },
            {
                model: AccountTag,
                attributes: ["id", "name", "code"],
            },
        ],
    },
}))
export default class FundDestination extends Model {
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    default!: boolean;

    @Column
    codeCurrency!: string;

    @Column
    paymentWay!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;

    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @BelongsTo(() => Account)
    account!: Account;

    @ForeignKey(() => AccountTag)
    @Column
    accountTagId!: number;

    @BelongsTo(() => AccountTag)
    accountTag!: AccountTag;
}
