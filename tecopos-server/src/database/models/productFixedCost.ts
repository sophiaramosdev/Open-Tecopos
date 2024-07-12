import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
    Scopes,
} from "sequelize-typescript";
import Product from "./product";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "costAmount", "description"],
    },
}))
export default class ProductFixedCost extends Model {
    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    costAmount!: number;

    @Column
    description!: string;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;
}
