import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    BelongsToMany,
    Scopes,
} from "sequelize-typescript";
import Address from "./address";

import Business from "./business";
import Image from "./image";
import Phone from "./phone";
import PhoneSupplier from "./phoneSupplier";
import StockMovement from "./stockMovement";
import Municipality from "./municipality";
import Province from "./province";
import Country from "./country";
import Product from "./product";
import Batch from "./batch";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "observations", "createdAt"],
        include: [
            {
                model: Address,
                attributes: [
                    "street_1",
                    "street_2",
                    "description",
                    "city",
                    "postalCode",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["id", "name", "code"],
                    },
                ],
            },
            {
                model: Phone,
                attributes: ["number", "description"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Image,
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
        ],
    },
}))
export default class Supplier extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @ForeignKey(() => Address)
    @Column
    addressId!: number;

    @BelongsTo(() => Address)
    address?: Address;

    @HasMany(() => StockMovement)
    stockMovements!: StockMovement[];

    @HasMany(() => Product)
    products!: Product[];

    @HasMany(() => Batch)
    batchs!: Batch[];

    @BelongsToMany(() => Phone, () => PhoneSupplier)
    phones?: Phone[];

    @ForeignKey(() => Image)
    @Column
    imageId!: number;

    @BelongsTo(() => Image)
    image!: Image;
}
