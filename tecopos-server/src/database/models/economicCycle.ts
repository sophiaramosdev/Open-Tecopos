import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    IsEmail,
    ForeignKey,
    BelongsTo,
    HasMany,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";
import CashRegisterOperation from "./cashRegisterOperation";
import OrderReceipt from "./orderReceipt";
import PriceSystem from "./priceSystem";
import StockAreaBook from "./stockAreaBook";
import User from "./user";
import StockMovement from "./stockMovement";
import Image from "./image";
import Dispatch from "./dispatch";
import Store from "./store";
import PartialPayment from "./partialPayment";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "observations",
            "openDate",
            "closedDate",
            "businessId",
            "priceSystemId",
            "isActive",
            "meta",
        ],
        include: [
            {
                model: User,
                as: "openBy",
                attributes: ["id", "email", "username", "displayName"],
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
                as: "closedBy",
                attributes: ["id", "email", "username", "displayName"],
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
                model: PriceSystem,
                attributes: ["id", "name", "isMain"],
                paranoid: false,
            },
        ],
    },
}))
export default class EconomicCycle extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.DATE,
    })
    openDate!: Date;

    @Column({
        type: DataType.DATE,
    })
    closedDate!: Date;

    @Column({
        type: DataType.FLOAT,
    })
    exchangeRateCostToMain!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column
    status!: "ACTIVE" | "ON_HOLD" | "CLOSED";

    /*
    meta: {
        exchange_rates: [{"exchangeRate":number,"isMain":boolean,"name":string,"code":string}]
        }
    */
    @Column({
        type: DataType.TEXT,
    })
    meta!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @ForeignKey(() => User)
    @Column
    openById!: number;

    @BelongsTo(() => User, "openById")
    openBy!: User;

    @ForeignKey(() => User)
    @Column
    closedById!: number;

    @BelongsTo(() => User, "closedById")
    closedBy!: User;

    @HasMany(() => OrderReceipt, {
        onDelete: "CASCADE",
    })
    orderReceipts!: OrderReceipt[];

    @HasMany(() => StockMovement, {
        onDelete: "CASCADE",
    })
    stockMovements!: StockMovement[];

    @HasMany(() => StockAreaBook, {
        onDelete: "CASCADE",
    })
    stockAreasBook!: StockAreaBook[];

    @HasMany(() => Store)
    stores!: Store[];

    @ForeignKey(() => PriceSystem)
    @Column
    priceSystemId!: number;

    @BelongsTo(() => PriceSystem)
    priceSystem!: PriceSystem;

    @HasMany(() => CashRegisterOperation)
    cashRegisterOperations?: CashRegisterOperation[];

    @HasMany(() => Dispatch)
    dispatches?: Dispatch[];

    @HasMany(() => PartialPayment)
    partialPayments?: PartialPayment[];
}
