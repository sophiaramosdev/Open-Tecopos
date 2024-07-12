import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    Scopes,
    HasMany,
} from "sequelize-typescript";
import Business from "./business";
import User from "./user";
import Image from "./image";
import ProductProductionOrder from "./productProductionOrder";
import StockMovement from "./stockMovement";
import Dispatch from "./dispatch";
import Product from "./product";
import OrderProductionFixedCost from "./orderProductionFixedCost";
import Area from "./area";
import { production_order_mode } from "../../interfaces/nomenclators";
import ProductCategory from "./productCategory";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "observations",
            "closedDate",
            "status",
            "openDate",
            "totalGoalQuantity",
            "totalProduced",
            "name",
            "totalCost",
            "plannedCost",
        ],
        include: [
            {
                model: User,
                as: "createdBy",
                attributes: ["email", "username", "displayName"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["src", "thumbnail", "blurHash"],
                    },
                ],
                paranoid: false,
            },
        ],
    },
    full: {
        attributes: [
            "id",
            "status",
            "observations",
            "openDate",
            "closedDate",
            "businessId",
            "totalGoalQuantity",
            "totalProduced",
            "name",
            "totalCost",
            "plannedCost",
        ],
        include: [
            {
                model: User,
                as: "createdBy",
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
                model: Area,
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: ProductProductionOrder,
                attributes: [],
                include: [
                    {
                        model: Product,
                        include: [
                            {
                                model: Image,
                                as: "images",
                                attributes: [
                                    "id",
                                    "src",
                                    "thumbnail",
                                    "blurHash",
                                ],
                                through: {
                                    attributes: [],
                                },
                            },
                        ],
                    },
                    {
                        model: ProductCategory,
                        attributes: ["id", "name", "description"],
                    },
                ],
            },
        ],
    },
}))
export default class ProductionOrder extends Model {
    @Column
    name!: string;

    @Column({
        defaultValue: "FLEXIBLE",
    })
    mode!: production_order_mode;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.DATE,
    })
    closedDate!: Date;

    @Column({
        type: DataType.DATE,
    })
    openDate!: Date;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    totalGoalQuantity!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    totalProduced!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    totalRealProduced!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    totalCost!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    plannedCost!: number;

    @Column
    status!: "CREATED" | "ACTIVE" | "CLOSED";

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
    createdById!: number;

    @BelongsTo(() => User, "createdById")
    createdBy!: User;

    @HasMany(() => ProductProductionOrder)
    products!: ProductProductionOrder[];

    @HasMany(() => StockMovement)
    stockMovements!: StockMovement[];

    @HasMany(() => OrderProductionFixedCost)
    fixedCosts!: OrderProductionFixedCost[];

    @ForeignKey(() => Dispatch)
    @Column
    dispatchId!: number;

    @BelongsTo(() => Dispatch)
    dispatch!: Dispatch;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;
}
