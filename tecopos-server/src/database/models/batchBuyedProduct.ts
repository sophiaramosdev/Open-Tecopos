import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    DataType,
} from "sequelize-typescript";
import Batch from "./batch";
import Variation from "./variation";

@Table
export default class BatchBuyedProduct extends Model {
    @Column
    status!: "RECEIVED" | "DAMAGED" | "NOT_RECEIVED";

    @Column
    name!: string;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    quantity!: number;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

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
