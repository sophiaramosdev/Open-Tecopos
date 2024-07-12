import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    Scopes,
    DataType,
} from "sequelize-typescript";
import { measureType } from "../../interfaces/nomenclators";
import Price from "./price";
import Product from "./product";
import Recipe from "./recipe";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "measure", "productionQuantity"],
    },
}))
export default class ProductRawRecipe extends Model {
    @Column
    name!: string;

    @Column
    measure!: measureType;

    @Column({
        type: DataType.FLOAT,
    })
    quantity!: number;

    @Column({
        type: DataType.FLOAT,
    })
    consumptionIndex!: number;

    //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    //Relations
    @ForeignKey(() => Recipe)
    @Column
    recipeId!: number;

    @BelongsTo(() => Recipe)
    recipe!: Recipe;
}
