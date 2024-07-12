import {
    Table,
    Column,
    Model,
    ForeignKey,
    PrimaryKey,
    AutoIncrement,
    DataType,
    BelongsTo,
} from "sequelize-typescript";

import Product from "./product";
import Variation from "./variation";

@Table
export default class Combo extends Model {
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
    comboBaseProductId!: number;

    @BelongsTo(() => Product, "comboBaseProductId")
    comboBaseProduct!: Product;

    @ForeignKey(() => Product)
    @Column
    composedId!: number;

    @BelongsTo(() => Product, "composedId")
    composed!: Product;

    @ForeignKey(() => Variation)
    @Column
    variationId!: number;

    @BelongsTo(() => Variation)
    variation!: Variation;
}
