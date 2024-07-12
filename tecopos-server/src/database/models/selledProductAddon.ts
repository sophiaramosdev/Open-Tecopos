import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    PrimaryKey,
    AutoIncrement,
    DataType,
} from "sequelize-typescript";
import Price from "./price";

import Product from "./product";
import SelledProduct from "./selledProduct";

@Table
export default class SelledProductAddon extends Model {
    @Column
    name!: string;

    @Column({
        defaultValue: 1,
    })
    quantity!: number;

    //Relations
    @ForeignKey(() => SelledProduct)
    @Column
    selledProductId!: number;

    @BelongsTo(() => SelledProduct)
    selledProduct!: SelledProduct;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => Price)
    @Column
    priceUnitaryId!: number;

    @BelongsTo(() => Price)
    priceUnitary!: Price;
}
