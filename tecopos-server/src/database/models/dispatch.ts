import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    Scopes,
    HasOne,
} from "sequelize-typescript";
import Area from "./area";
import Business from "./business";
import {
    dispatchs_mode,
    dispatchs_status,
} from "../../interfaces/nomenclators";
import DispatchProduct from "./dispatchProduct";
import User from "./user";
import StockMovement from "./stockMovement";
import Image from "./image";
import Price from "./price";
import OrderReceipt from "./orderReceipt";
import ProductionOrder from "./productionOrder";
import EconomicCycle from "./economicCycle";
import Variation from "./variation";
import BuyedReceipt from "./buyedReceipt";
import Product from "./product";
import Batch from "./batch";
import BatchDispatchProduct from "./batchDispatchProduct";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "observations",
            "status",
            "mode",
            "businessId",
            "createdAt",
            "rejectedAt",
            "receivedAt",
        ],
        include: [
            {
                model: Area,
                as: "stockAreaFrom",
                attributes: ["id", "name", "businessId"],
                include: [
                    {
                        model: Business,
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                ],
                paranoid: false,
                required: false,
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
                model: User,
                as: "receivedBy",
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
                model: User,
                as: "rejectedBy",
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
                model: DispatchProduct,
                attributes: [
                    "name",
                    "quantity",
                    "universalCode",
                    "measure",
                    "productId",
                    "observations",
                    "noPackages",
                ],
                include: [
                    {
                        model: Price,
                        as: "price",
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: Price,
                        as: "cost",
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: BatchDispatchProduct,
                        attributes: ["quantity", "uniqueCode"],
                    },
                    {
                        model: Variation,
                        attributes: ["id", "name"],
                    },
                    {
                        model: Product,
                        attributes: [
                            "id",
                            "name",
                            "barCode",
                            "enableGroup",
                            "groupName",
                            "groupConvertion",
                        ],
                    },
                ],
            },
        ],
    },
}))
export default class Dispatch extends Model {
    @Column
    receivedAt!: Date;

    @Column
    rejectedAt!: Date;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column
    mode!: dispatchs_mode;

    @Column
    status!: dispatchs_status;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @ForeignKey(() => EconomicCycle)
    @Column
    economicCycleId!: number;

    @BelongsTo(() => EconomicCycle)
    economicCycle!: EconomicCycle;

    @ForeignKey(() => User)
    @Column
    createdById!: number;

    @BelongsTo(() => User, "createdById")
    createdBy?: User;

    @ForeignKey(() => User)
    @Column
    receivedById!: number;

    @BelongsTo(() => User, "receivedById")
    receivedBy?: User;

    @ForeignKey(() => User)
    @Column
    rejectedById!: number;

    @BelongsTo(() => User, "rejectedById")
    rejectedBy?: User;

    @ForeignKey(() => Area)
    @Column
    stockAreaFromId!: number;

    @BelongsTo(() => Area, "stockAreaFromId")
    stockAreaFrom!: Area;

    @ForeignKey(() => Area)
    @Column
    stockAreaToId!: number;

    @BelongsTo(() => Area, "stockAreaToId")
    stockAreaTo!: Area;

    @HasMany(() => DispatchProduct, "dispatchId")
    products!: DispatchProduct[];

    @HasMany(() => StockMovement)
    stockMovements!: StockMovement[];

    @HasOne(() => OrderReceipt)
    order!: OrderReceipt;

    @HasOne(() => ProductionOrder)
    productionOrder!: ProductionOrder;

    @HasOne(() => BuyedReceipt)
    buyedReceipt!: BuyedReceipt;
}
