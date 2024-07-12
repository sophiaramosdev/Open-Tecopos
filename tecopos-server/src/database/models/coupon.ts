import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    HasMany,
    HasOne,
    BelongsToMany,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";

import Product from "./product";
import { discount_types } from "../../interfaces/nomenclators";
import Business from "./business";
import AllowedProductsCoupon from "./allowedProductsCoupon";
import ExcludedProductsCoupon from "./excludedProductsCoupon";
import SalesCategory from "./salesCategory";
import AllowedCategoriesCoupon from "./allowedCategoriesCoupon";
import ExcludedCategoriesCoupon from "./excludedCategoriesCoupon ";
import User from "./user";
import ListUsedClientsCoupon from "./listUsedClientsCoupon";
import ListAllowedUsersCoupon from "./listAllowedClientsCoupon";
import OrderReceipt from "./orderReceipt";
import OrderReceiptCoupon from "./orderReceiptCoupon";
import Client from "./client";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "code",
            "amount",
            "codeCurrency",
            "discountType",
            "description",
            "expirationAt",
            "usageCount",
            "usageLimit",
            "usageLimitPerUser",
            "limitUsageToXItems",
            "freeShipping",
            "excludeOnSaleProducts",
            "individualUse",
            "minimumAmount",
            "maximumAmount",
            "createdAt",
        ],
        include: [
            {
                model: Product,
                as: "allowedProducts",
                attributes: ["id", "name"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Product,
                as: "excludedProducts",
                attributes: ["id", "name"],
                through: {
                    attributes: [],
                },
            },
            {
                model: SalesCategory,
                as: "allowedSalesCategories",
                attributes: ["id", "name"],
                through: {
                    attributes: [],
                },
            },
            {
                model: SalesCategory,
                as: "excludedSalesCategories",
                attributes: ["id", "name"],
                through: {
                    attributes: [],
                },
            },
        ],
    },
}))
export default class Coupon extends Model {
    @Column
    code!: string;

    @Column({
        allowNull: false,
        type: DataType.FLOAT,
    })
    amount!: number;

    @Column
    codeCurrency!: string;

    @Column
    discountType!: discount_types;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column
    expirationAt!: Date;

    @Column
    usageCount!: number;

    @Column
    usageLimit!: number;

    @Column
    usageLimitPerUser!: number;

    @Column
    limitUsageToXItems!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    freeShipping!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    excludeOnSaleProducts!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    individualUse!: boolean;

    @Column
    minimumAmount!: number;

    @Column
    maximumAmount!: number;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @BelongsToMany(() => Product, {
        through: { model: () => AllowedProductsCoupon, unique: false },
    })
    allowedProducts?: Product[];

    @BelongsToMany(() => Product, {
        through: { model: () => ExcludedProductsCoupon, unique: false },
    })
    excludedProducts?: Product[];

    @BelongsToMany(() => SalesCategory, {
        through: { model: () => AllowedCategoriesCoupon, unique: false },
    })
    allowedSalesCategories?: SalesCategory[];

    @BelongsToMany(() => SalesCategory, {
        through: { model: () => ExcludedCategoriesCoupon, unique: false },
    })
    excludedSalesCategories?: SalesCategory[];

    @BelongsToMany(() => Client, {
        as: "listUsedBy",
        through: { model: () => ListUsedClientsCoupon, unique: false },
    })
    listUsedBy?: Client[];

    @BelongsToMany(() => Client, {
        as: "listAllowedClients",
        through: { model: () => ListAllowedUsersCoupon, unique: false },
    })
    listAllowedClients?: Client[];

    @BelongsToMany(() => OrderReceipt, {
        through: { model: () => OrderReceiptCoupon, unique: false },
    })
    orders?: OrderReceipt[];
}
