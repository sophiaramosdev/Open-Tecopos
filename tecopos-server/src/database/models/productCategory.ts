import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    HasMany,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";

import Image from "./image";
import Product from "./product";
import ProductProductionOrder from "./productProductionOrder";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "description", "createdAt"],
        include: [
            {
                model: Image,
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
        ],
    },
}))
export default class ProductCategory extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column
    universalCode!: number;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @HasMany(() => Product)
    products!: Product[];

    @HasMany(() => ProductProductionOrder)
    productProductionOrders!: ProductProductionOrder[];

    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @ForeignKey(() => Image)
    @Column
    imageId!: number;

    @BelongsTo(() => Image)
    image!: Image;
}
