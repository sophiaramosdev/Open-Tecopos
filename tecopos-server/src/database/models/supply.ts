import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    BelongsTo,
    ForeignKey,
    PrimaryKey,
    AutoIncrement,
} from "sequelize-typescript";

import Product from "./product";

@Table
export default class Supply extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column
    id!: number;

    @Column({
        type: DataType.FLOAT,
        allowNull: false,
    })
    quantity!: number;

    //Relations
    @ForeignKey(() => Product)
    @Column
    baseProductId!: number;

    @BelongsTo(() => Product, "baseProductId")
    baseProduct!: Product;

    @ForeignKey(() => Product)
    @Column
    supplyId!: number;

    @BelongsTo(() => Product, "supplyId")
    supply!: Product;
}
