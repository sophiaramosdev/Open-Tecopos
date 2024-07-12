import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    DataType,
} from "sequelize-typescript";

import StockAreaProduct from "./stockAreaProduct";
import Batch from "./batch";
import Variation from "./variation";

@Table
export default class BatchProductStockArea extends Model {
    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    quantity!: number;

    @Column
    entryAt!: Date;

    @Column
    expirationAt!: Date;

    //Relations
    @ForeignKey(() => StockAreaProduct)
    @Column
    stockAreaProductId!: number;

    @BelongsTo(() => StockAreaProduct)
    stockAreaProduct!: StockAreaProduct;

    @ForeignKey(() => Batch)
    @Column
    batchId!: number;

    @BelongsTo(() => Batch)
    batch!: Batch;

    @ForeignKey(() => Variation)
    @Column
    variationId!: number;

    @BelongsTo(() => Variation)
    variation!: Variation;
}
