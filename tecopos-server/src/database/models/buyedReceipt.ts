import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
    DataType,
    HasMany,
    Scopes,
    DeletedAt,
} from "sequelize-typescript";
import Business from "./business";
import Document from "./document";
import DocumentBuyedReceipt from "./documentBuyedReceipt";
import Area from "./area";
import User from "./user";
import Account from "./account";
import Dispatch from "./dispatch";
import BuyedReceiptFixedCost from "./buyedReceiptFixedCost";
import Batch from "./batch";
import BuyedReceiptOperation from "./buyedReceiptOperation";
import BatchBuyedProduct from "./batchBuyedProduct";
import Price from "./price";
import Image from "./image";
import Product from "./product";
import Variation from "./variation";
import FixedCostCategory from "./fixedCostCategory";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "observations",
            "status",
            "totalCost",
            "businessId",
            "operationNumber",
            "createdAt",
        ],
        include: [
            {
                model: Batch,
                attributes: [
                    "id",
                    "businessId",
                    "description",
                    "uniqueCode",
                    "expirationAt",
                    "entryQuantity",
                    "noPackages",
                    "measure",
                ],
                include: [
                    {
                        model: BatchBuyedProduct,
                        attributes: ["status", "quantity", "observations"],
                    },
                    {
                        model: Product,
                        attributes: ["id", "name", "type"],
                    },
                    {
                        model: Variation,
                        attributes: ["id", "name"],
                    },
                    {
                        model: Price,
                        as: "grossCost",
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: Price,
                        as: "netCost",
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: Price,
                        as: "registeredPrice",
                        attributes: ["amount", "codeCurrency"],
                    },
                ],
            },
            {
                model: User,
                as: "createdBy",
                attributes: ["username", "email", "displayName"],
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
                model: Area,
                as: "stockAreaTo",
                attributes: ["id", "name", "businessId"],
                include: [
                    {
                        model: Business,
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                ],
                paranoid: false,
            },
            {
                model: Account,
                attributes: ["id", "address", "name"],
                paranoid: false,
            },
            {
                model: Dispatch,
                attributes: [
                    "id",
                    "status",
                    "createdAt",
                    "rejectedAt",
                    "receivedAt",
                ],
                paranoid: false,
                include: [
                    {
                        model: Area,
                        as: "stockAreaTo",
                        attributes: ["id", "name", "businessId"],
                        include: [
                            {
                                model: Business,
                                attributes: ["id", "name"],
                                paranoid: false,
                            },
                        ],
                        paranoid: false,
                    },
                ],
            },
            {
                model: BuyedReceiptFixedCost,
                attributes: ["id", "costAmount", "observations"],
                include: [
                    {
                        model: FixedCostCategory,
                        attributes: ["id", "name"],
                    },
                ],
            },
            {
                model: Document,
                attributes: ["id", "title", "description", "src"],
                through: {
                    attributes: [],
                },
            },
        ],
    },
}))
export default class BuyedReceipt extends Model {
    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 1,
    })
    operationNumber!: number;

    @Column
    status!: "CREATED" | "DISPATCHED" | "CONFIRMED" | "CANCELLED";

    @Column({
        allowNull: false,
        type: DataType.FLOAT,
    })
    totalCost!: number;

    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @BelongsToMany(() => Document, {
        through: { model: () => DocumentBuyedReceipt, unique: false },
    })
    documents?: Document[];

    @ForeignKey(() => Area)
    @Column
    stockAreaToId!: number;

    @BelongsTo(() => Area)
    stockAreaTo!: Area;

    @ForeignKey(() => User)
    @Column
    createdById!: number;

    @BelongsTo(() => User)
    createdBy?: User;

    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @BelongsTo(() => Account)
    account?: Account;

    @ForeignKey(() => Dispatch)
    @Column
    dispatchId!: number;

    @BelongsTo(() => Dispatch)
    dispatch!: Dispatch;

    @HasMany(() => BuyedReceiptFixedCost)
    costs!: BuyedReceiptFixedCost[];

    @HasMany(() => Batch)
    batches!: Batch[];

    @HasMany(() => BuyedReceiptOperation)
    operations!: BuyedReceiptOperation[];
}
