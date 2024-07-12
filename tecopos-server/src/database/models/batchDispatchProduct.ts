import {
    Table,
    Column,
    Model,
    DataType,
    BelongsTo,
    ForeignKey,
} from "sequelize-typescript";

import Batch from "./batch";
import DispatchProduct from "./dispatchProduct";

@Table
export default class BatchDispatchProduct extends Model {
    @Column({
        type: DataType.FLOAT,
        allowNull: false,
    })
    quantity!: number;

    @Column
    uniqueCode!: string;

    //Relations
    @ForeignKey(() => DispatchProduct)
    @Column
    dispatchProductId!: number;

    @BelongsTo(() => DispatchProduct)
    dispatchProduct!: DispatchProduct;

    @ForeignKey(() => Batch)
    @Column
    batchId!: number;

    @BelongsTo(() => Batch)
    batch!: Batch;
}
