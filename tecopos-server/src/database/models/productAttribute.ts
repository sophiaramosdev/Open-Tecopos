import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    HasOne,
    BelongsToMany,
    Scopes,
} from "sequelize-typescript";
import Product from "./product";
import Variation from "./variation";
import VariationProductAttribute from "./variationProductAttribute";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "code", "value"],
    },
}))
export default class ProductAttribute extends Model {
    @Column
    name!: string;

    @Column
    code!: string;

    @Column
    value!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @BelongsToMany(() => Variation, {
        as: "variations",
        through: { model: () => VariationProductAttribute, unique: false },
    })
    variations?: Variation[];
}
