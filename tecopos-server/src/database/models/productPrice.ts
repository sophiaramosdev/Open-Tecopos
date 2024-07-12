import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
} from "sequelize-typescript";
import Product from "./product";
import PriceSystem from "./priceSystem";

@Table
export default class ProductPrice extends Model {
    @Column({
        allowNull: false,
        type: DataType.FLOAT,
    })
    price!: number;

    @Column
    codeCurrency!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isMain!: boolean;

    //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => PriceSystem)
    @Column
    priceSystemId!: number;

    @BelongsTo(() => PriceSystem)
    priceSystem!: PriceSystem;
}
