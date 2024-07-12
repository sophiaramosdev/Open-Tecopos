import {
    Table,
    Column,
    Model,
    ForeignKey,
    DataType,
    BelongsTo,
    HasMany,
} from "sequelize-typescript";
import Product from "./product";
import Dispatch from "./dispatch";
import Price from "./price";
import { measureType } from "../../interfaces/nomenclators";
import Variation from "./variation";
import Batch from "./batch";
import BatchDispatchProduct from "./batchDispatchProduct";

@Table
export default class DispatchProduct extends Model {
    @Column({
        type: DataType.FLOAT,
    })
    quantity!: number;

    @Column
    name!: string;

    @Column
    measure!: measureType;

    @Column
    universalCode!: number;

    @Column
    observations!: string;

    @Column
    noPackages!: number;

    //Relations
    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => Dispatch)
    @Column
    dispatchId!: number;

    @BelongsTo(() => Dispatch)
    dispatch!: Dispatch;

    @ForeignKey(() => Price)
    @Column
    priceId!: number;

    @BelongsTo(() => Price, { foreignKey: "priceId", as: "price" })
    price!: Price;

    @ForeignKey(() => Price)
    @Column
    costId!: number;

    @BelongsTo(() => Price, { foreignKey: "costId", as: "cost" })
    cost!: Price;

    @ForeignKey(() => Variation)
    @Column
    variationId!: number;

    @BelongsTo(() => Variation)
    variation!: Variation;

    @HasMany(() => BatchDispatchProduct)
    batches!: BatchDispatchProduct[];
}
