import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";
import Sequence from "./sequence";
import User from "./user";
import Page from "./page";
import Product from "./product";
import ProductPrice from "./productPrice";
import Template from "./template";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "uniqueCode",
            "description",
            "createdAt",
            "isActive",
            "orientation",
            "businessId",
        ],
        include: [
            {
                model: Sequence,
                attributes: [
                    "id",
                    "name",
                    "code",
                    "meta",
                    "isActive",
                    "description",
                ],
            },
            {
                model: Page,
                attributes: ["id", "order", "meta"],
                as: "pages",
                include: [
                    {
                        model: Product,
                        attributes: ["id", "name", "measure", "type"],
                        include: [
                            {
                                model: ProductPrice,
                                attributes: [
                                    "id",
                                    "price",
                                    "codeCurrency",
                                    "isMain",
                                    "priceSystemId",
                                ],
                                separate: true,
                            },
                        ],
                    },
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
        ],
    },
    simple_return: {
        attributes: [
            "id",
            "name",
            "description",
            "createdAt",
            "isActive",
            "orientation",
        ],
    },
}))
export default class Tv extends Model {
    @Column
    uniqueCode!: string;

    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        defaultValue: 0,
    })
    orientation!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @ForeignKey(() => Sequence)
    @Column
    sequenceId!: number;

    @BelongsTo(() => Sequence)
    sequence!: Sequence;

    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User)
    madeBy!: User;

    @HasMany(() => Page)
    pages!: Page[];
}
