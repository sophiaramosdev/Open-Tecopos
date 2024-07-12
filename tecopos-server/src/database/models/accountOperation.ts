import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    HasOne,
    Scopes,
} from "sequelize-typescript";

import { accountOperationType } from "../../interfaces/nomenclators";
import Account from "./account";
import Price from "./price";
import User from "./user";
import Image from "./image";
import AccountTag from "./accountTag";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "noTransaction",
            "operation",
            "description",
            "createdAt",
            "blocked",
            "registeredAt",
        ],
        include: [
            {
                model: User,
                as: "madeBy",
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
                model: AccountTag,
                attributes: ["id", "name", "code"],
            },
            {
                model: Price,
                as: "amount",
                attributes: ["amount", "codeCurrency"],
            },
        ],
    },
    details: {
        attributes: [
            "id",
            "noTransaction",
            "operation",
            "description",
            "createdAt",
            "accountId",
            "blocked",
            "registeredAt",
        ],
        include: [
            {
                model: User,
                as: "madeBy",
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
                model: Price,
                as: "amount",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: AccountTag,
                attributes: ["id", "name", "code"],
            },
            {
                model: AccountOperation,
                as: "parent",
                attributes: ["id", "operation", "createdAt"],
                include: [
                    {
                        model: User,
                        as: "madeBy",
                        attributes: ["displayName", "username", "email"],
                        include: [
                            {
                                model: Image,
                                as: "avatar",
                                attributes: [
                                    "id",
                                    "src",
                                    "thumbnail",
                                    "blurHash",
                                ],
                            },
                        ],
                        paranoid: false,
                    },
                    {
                        model: Price,
                        as: "amount",
                        attributes: ["amount", "codeCurrency"],
                    },
                ],
            },
        ],
    },
}))
export default class AccountOperation extends Model {
    @Column
    operation!: accountOperationType;

    @Column({
        type: DataType.STRING,
    })
    noTransaction!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    blocked!: boolean;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column
    registeredAt!: Date;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User)
    madeBy!: User;

    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @BelongsTo(() => Account)
    account?: Account;

    @ForeignKey(() => AccountTag)
    @Column
    accountTagId!: number;

    @BelongsTo(() => AccountTag)
    accountTag?: AccountTag;

    @ForeignKey(() => AccountOperation)
    @Column
    parentId!: number;

    @BelongsTo(() => AccountOperation)
    parent?: AccountOperation;

    @HasOne(() => AccountOperation, "parentId")
    child!: AccountOperation;

    @ForeignKey(() => Price)
    @Column
    amountId!: number;

    @BelongsTo(() => Price)
    amount?: Price;
}
