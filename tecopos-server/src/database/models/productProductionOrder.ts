import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";

import { measureType } from "../../interfaces/nomenclators";
import Product from "./product";
import ProductionOrder from "./productionOrder";
import ProductCategory from "./productCategory";

@Table
export default class ProductProductionOrder extends Model {
    @Column
    name!: string;

    @Column
    measure!: measureType;

    @Column
    type!: "RAW" | "END";

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    goalQuantity!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    realProduced!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    quantity!: number;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => ProductionOrder)
    @Column
    productionOrderId!: number;

    @BelongsTo(() => ProductionOrder)
    productionOrder!: ProductionOrder;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => ProductCategory)
    @Column
    productCategoryId!: number;

    @BelongsTo(() => ProductCategory)
    productCategory!: ProductCategory;
}
