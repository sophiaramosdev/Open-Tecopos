import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
    HasMany,
    Scopes,
} from "sequelize-typescript";

import Business from "./business";
import User from "./user";
import Area from "./area";
import AllowedAccountUser from "./allowedAccountUser";
import Price from "./price";
import AccountBalance from "./accountBalance";
import AccountOperation from "./accountOperation";
import Image from "./image";
import AccountRecord from "./accountRecord";
import AccountTag from "./accountTag";
import FundDestination from "./fundDestination";
import BuyedReceipt from "./buyedReceipt";
import AccountAccountList from "./accountAccountList";
import AccountList from "./accountList";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "address",
            "code",
            "description",
            "isActive",
            "isBlocked",
            "isPrivate",
            "createdAt",
            "allowMultiCurrency",
            "definedCurrency",
            "businessId",
        ],
        include: [
            {
                model: Business,
                attributes: ["id", "name"],
                include: [
                    {
                        model: Image,
                        as: "logo",
                        attributes: ["src", "thumbnail", "blurHash"],
                    },
                ],
            },
            {
                model: User,
                as: "owner",
                attributes: ["id", "displayName", "username", "email"],
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
                model: User,
                as: "createdBy",
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
        ],
    },
    details: {
        attributes: [
            "id",
            "name",
            "address",
            "code",
            "description",
            "isActive",
            "isBlocked",
            "isPrivate",
            "createdAt",
            "allowMultiCurrency",
            "definedCurrency",
        ],
        include: [
            {
                model: User,
                as: "owner",
                attributes: ["id", "displayName", "username", "email"],
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
                model: User,
                as: "createdBy",
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
                through: {
                    attributes: [],
                },
                as: "actualBalance",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: User,
                through: {
                    attributes: [],
                },
                as: "allowedUsers",
                attributes: ["id", "displayName", "username", "email"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
            },
        ],
    },
}))
export default class Account extends Model {
    @Column({
        allowNull: false,
    })
    address!: string;

    @Column
    name!: string;

    @Column
    code!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    allowMultiCurrency!: boolean;

    @Column
    definedCurrency!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isBlocked!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isPrivate!: boolean;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => User)
    @Column
    ownerId!: number;

    @BelongsTo(() => User, { foreignKey: "ownerId", constraints: false })
    owner!: User;

    @ForeignKey(() => User)
    @Column
    createdById!: number;

    @BelongsTo(() => User, { foreignKey: "createdById", constraints: false })
    createdBy!: User;

    @ForeignKey(() => Business)
    @Column
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @HasMany(() => Area)
    areaSales!: Area[];

    @HasMany(() => AccountOperation)
    operations!: AccountOperation[];

    @HasMany(() => AccountRecord)
    records!: AccountRecord[];

    @HasMany(() => AccountTag)
    tags!: AccountTag[];

    @HasMany(() => FundDestination)
    fundDestinations!: FundDestination[];

    @HasMany(() => BuyedReceipt)
    buyedReceipts!: BuyedReceipt[];

    @BelongsToMany(() => User, {
        as: "allowedUsers",
        through: { model: () => AllowedAccountUser, unique: false },
    })
    allowedUsers?: User[];

    @BelongsToMany(() => AccountList, {
        as: "accountList",
        through: { model: () => AccountAccountList, unique: false },
    })
    accountList?: AccountList[];

    @BelongsToMany(() => Price, () => AccountBalance)
    actualBalance?: Price[];
}
