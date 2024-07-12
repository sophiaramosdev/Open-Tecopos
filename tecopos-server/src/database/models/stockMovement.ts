import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    HasOne,
    Scopes,
} from "sequelize-typescript";

import Area from "./area";
import Business from "./business";
import Product from "./product";
import User from "./user";
import Supplier from "./supplier";
import EconomicCycle from "./economicCycle";
import Variation from "./variation";
import {
    operation_movements_types,
    operation_movement_status_types,
    operation_category_types,
} from "../../interfaces/nomenclators";
import Price from "./price";
import Dispatch from "./dispatch";
import Shift from "./shift";
import ProductState from "./productState";
import ProductionOrder from "./productionOrder";
import MovementStateRecord from "./movementStateRecord";
import Image from "./image";
import ProductFixedCost from "./productFixedCost";
import Supply from "./supply";
import ProductPrice from "./productPrice";
import Document from "./document";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "quantity",
            "operation",
            "description",
            "costBeforeOperation",
            "accountable",
            "businessId",
            "createdAt",
        ],
        include: [
            {
                model: Product,
                as: "product",
                attributes: ["id", "name", "measure", "type"],
                paranoid: false,
                include: [
                    {
                        model: Image,
                        as: "images",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                        through: {
                            attributes: [],
                        },
                    },
                ],
            },
            {
                model: StockMovement,
                as: "removedOperation",
                include: [
                    {
                        model: User,
                        as: "movedBy",
                        attributes: ["id", "email", "username", "displayName"],
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
                        model: Area,
                        as: "area",
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                    {
                        model: Area,
                        as: "movedTo",
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                ],
            },
            {
                model: StockMovement,
                as: "parent",
                include: [
                    {
                        model: User,
                        as: "movedBy",
                        attributes: ["id", "email", "username", "displayName"],
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
                        model: Area,
                        as: "area",
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                    {
                        model: Area,
                        as: "movedTo",
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                    {
                        model: Product,
                        attributes: ["id", "name", "measure", "type"],
                        paranoid: false,
                    },
                ],
            },
            {
                model: StockMovement,
                as: "childs",
                include: [
                    {
                        model: User,
                        as: "movedBy",
                        attributes: ["id", "email", "username", "displayName"],
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
                        model: Area,
                        as: "area",
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                    {
                        model: Area,
                        as: "movedTo",
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                    {
                        model: Product,
                        attributes: ["id", "name", "measure", "type"],
                        paranoid: false,
                    },
                ],
            },
            {
                model: User,
                as: "movedBy",
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
                as: "area",
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: Supplier,
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: Area,
                as: "movedTo",
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: Price,
                attributes: ["id", "amount", "codeCurrency"],
            },
            {
                model: Dispatch,
                attributes: ["id", "observations", "status", "mode"],
            },
            {
                model: Shift,
                attributes: [
                    "id",
                    "name",
                    "observations",
                    "openDate",
                    "closedDate",
                    "isActive",
                ],
            },
            {
                model: Variation,
                attributes: ["id", "name", "description", "onSale"],
                include: [
                    {
                        model: Price,
                        as: "price",
                        attributes: ["codeCurrency", "amount"],
                    },
                    {
                        model: Price,
                        as: "onSalePrice",
                        attributes: ["codeCurrency", "amount"],
                    },
                    {
                        model: Image,
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
            },
        ],
    },
    reduced: {
        attributes: [
            "id",
            "quantity",
            "operation",
            "description",
            "costBeforeOperation",
            "accountable",
            "businessId",
            "createdAt",
            "removedOperationId",
        ],
        include: [
            {
                model: Product,
                as: "product",
                attributes: ["id", "name", "measure", "averageCost", "type"],
                paranoid: false,
                include: [
                    {
                        model: Image,
                        as: "images",
                        attributes: ["id", "src", "thumbnail"],
                        through: {
                            attributes: [],
                        },
                    },
                    {
                        model: ProductFixedCost,
                        attributes: ["id", "costAmount", "description"],
                    },
                    {
                        model: ProductPrice,
                        attributes: [
                            "price",
                            "codeCurrency",
                            "isMain",
                            "priceSystemId",
                        ],
                    },
                    {
                        model: Supply,
                        attributes: ["id", "quantity"],
                        as: "supplies",
                        include: [
                            {
                                attributes: [
                                    "id",
                                    "name",
                                    "averageCost",
                                    "measure",
                                    "type",
                                ],
                                model: Product,
                                as: "supply",
                            },
                        ],
                    },
                ],
            },
            {
                model: User,
                as: "movedBy",
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
                model: Variation,
                attributes: ["id", "name"],
            },
        ],
    },
    to_production: {
        attributes: [
            "id",
            "quantity",
            "operation",
            "businessId",
            "createdAt",
            "removedOperationId",
        ],
        include: [
            {
                model: Product,
                as: "product",
                attributes: ["id", "name", "measure"],
                paranoid: false,
                include: [
                    {
                        model: Image,
                        as: "images",
                        attributes: ["src", "thumbnail", "blurHash"],
                        through: {
                            attributes: [],
                        },
                    },
                ],
            },
            {
                model: ProductState,
                attributes: ["id", "name"],
            },
            {
                model: User,
                as: "movedBy",
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
            {
                model: MovementStateRecord,
                as: "records",
                attributes: ["status", "createdAt"],
                paranoid: false,
                include: [
                    {
                        model: User,
                        as: "madeBy",
                        attributes: ["username", "displayName"],
                        paranoid: false,
                    },
                ],
                order: ["createdAt", "DESC"],
            },
        ],
    },
}))
export default class StockMovement extends Model {
    @Column({
        type: DataType.FLOAT,
        allowNull: false,
    })
    quantity!: number;

    @Column({
        type: DataType.FLOAT,
    })
    costBeforeOperation!: number;

    @Column
    operation!: operation_movements_types;

    @Column
    category!: operation_category_types;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        defaultValue: "APPROVED",
    })
    status!: operation_movement_status_types;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    accountable!: boolean;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product, "productId")
    product!: Product;

    @ForeignKey(() => Dispatch)
    @Column
    dispatchId!: number;

    @BelongsTo(() => Dispatch, "dispatchId")
    dispatch!: Dispatch;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area, "areaId")
    area!: Area;

    @ForeignKey(() => Area)
    @Column
    movedToId!: number;

    @BelongsTo(() => Area, "movedToId")
    movedTo?: Area;

    @ForeignKey(() => User)
    @Column
    movedById!: number;

    @BelongsTo(() => User, "movedById")
    movedBy!: User;

    @ForeignKey(() => User)
    @Column
    approvedById!: number;

    @BelongsTo(() => User, "approvedById")
    approvedBy?: User;

    @ForeignKey(() => Supplier)
    @Column
    supplierId!: number;

    @BelongsTo(() => Supplier)
    supplier?: Supplier;

    @ForeignKey(() => StockMovement)
    @Column({
        onDelete: "CASCADE",
    })
    parentId!: number;

    @BelongsTo(() => StockMovement, "parentId")
    parent!: StockMovement;

    @HasMany(() => StockMovement, "parentId")
    childs!: StockMovement[];

    @HasMany(() => MovementStateRecord)
    records!: MovementStateRecord[];

    @ForeignKey(() => StockMovement)
    @Column({
        onDelete: "CASCADE",
    })
    removedOperationId!: number;

    @BelongsTo(() => StockMovement, "removedOperationId")
    removedOperation!: StockMovement;

    @HasOne(() => StockMovement, "removedOperationId")
    childRemoved!: StockMovement;

    @ForeignKey(() => EconomicCycle)
    @Column({
        onDelete: "CASCADE",
    })
    economicCycleId!: number;

    @BelongsTo(() => EconomicCycle)
    economicCycle!: EconomicCycle;

    @ForeignKey(() => Variation)
    @Column
    variationId!: number;

    @BelongsTo(() => Variation)
    variation!: Variation;

    @ForeignKey(() => Price)
    @Column
    priceId!: number;

    @BelongsTo(() => Price)
    price!: Price;

    @ForeignKey(() => Shift)
    @Column
    shiftId!: number;

    @BelongsTo(() => Shift, "shiftId")
    shift!: Shift;

    @ForeignKey(() => ProductState)
    @Column
    productStateId!: number;

    @BelongsTo(() => ProductState)
    productState!: ProductState;

    @ForeignKey(() => ProductionOrder)
    @Column
    productionOrderId!: number;

    @BelongsTo(() => ProductionOrder)
    productionOrder!: ProductionOrder;

    @ForeignKey(() => Document)
    @Column
    documentId!: number;

    @BelongsTo(() => Document)
    document!: Document;
}
