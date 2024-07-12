import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    Scopes,
    DataType,
    HasMany,
    BelongsToMany,
} from "sequelize-typescript";
import { measureType } from "../../interfaces/nomenclators";
import Price from "./price";
import ProductRawRecipe from "./productRawRecipe";
import Product from "./product";
import Business from "./business";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "measure",
            "unityToBeProduced",
            "realPerformance",
            "totalCost",
            "unityToBeProducedCost",
        ],
        include: [
            {
                model: ProductRawRecipe,
                attributes: ["id", "quantity", "consumptionIndex"],
                include: [
                    {
                        model: Product,
                        attributes: ["id", "name", "measure", "averageCost"],
                    },
                ],
            },
            {
                model: Product,
                as: "products",
                attributes: ["id", "name"],
                required: false,
            },
        ],
    },
}))
export default class Recipe extends Model {
    @Column
    name!: string;

    @Column
    measure!: measureType;

    @Column({
        type: DataType.FLOAT,
    })
    unityToBeProduced!: number;

    @Column({
        type: DataType.FLOAT,
    })
    realPerformance!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    unityToBeProducedCost!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    totalCost!: number;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @HasMany(() => ProductRawRecipe)
    productsRawRecipe!: ProductRawRecipe[];

    @HasMany(() => Product)
    products!: Product[];
}
