import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import StockAreaProduct from "./stockAreaProduct";
import Variation from "./variation";

@Table
export default class StockAreaVariation extends Model {
    @Column({
        type: DataType.FLOAT,
        allowNull: false,
    })
    quantity!: number;

    //Relations
    @ForeignKey(() => StockAreaProduct)
    @Column
    stockAreaProductId!: number;

    @BelongsTo(() => StockAreaProduct)
    stockAreaProduct!: StockAreaProduct;

    @ForeignKey(() => Variation)
    @Column
    variationId!: number;

    @BelongsTo(() => Variation)
    variation!: Variation;
}
