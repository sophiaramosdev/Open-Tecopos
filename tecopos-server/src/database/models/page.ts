import {
    Table,
    Column,
    Model,
    DataType,
    Scopes,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import Tv from "./tv";
import Template from "./template";
import Product from "./product";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "meta", "createdAt", "isActive", "order"],
        include: [
            {
                model: Template,
                attributes: [
                    "id",
                    "name",
                    "code",
                    "isActive",
                    "structure",
                    "orientation",
                    "description",
                    "code",
                ],
            },
        ],
    },
}))
export default class Page extends Model {
    @Column
    order!: number;

    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    meta!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @ForeignKey(() => Tv)
    @Column
    tvId!: number;

    @BelongsTo(() => Tv)
    tv!: Tv;

    @ForeignKey(() => Template)
    @Column
    templateId!: number;

    @BelongsTo(() => Template)
    template!: Template;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;
}
