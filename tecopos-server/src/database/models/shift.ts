import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    HasMany,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";
import User from "./user";
import StockMovement from "./stockMovement";
import Image from "./image";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "observations",
            "openDate",
            "closedDate",
            "isActive",
        ],
        include: [
            {
                model: User,
                as: "openBy",
                attributes: ["email", "username", "displayName"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["src", "thumbnail", "blurHash"],
                    },
                ],
                paranoid: false,
            },
            {
                model: User,
                as: "closedBy",
                attributes: ["email", "username", "displayName"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["src", "thumbnail", "blurHash"],
                    },
                ],
                paranoid: false,
            },
        ],
    },
}))
export default class Shift extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.DATE,
    })
    openDate!: Date;

    @Column({
        type: DataType.DATE,
    })
    closedDate!: Date;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column
    status!: "ACTIVE" | "ON_HOLD" | "CLOSED";

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

    @ForeignKey(() => User)
    @Column
    openById!: number;

    @BelongsTo(() => User, "openById")
    openBy!: User;

    @ForeignKey(() => User)
    @Column
    closedById!: number;

    @BelongsTo(() => User, "closedById")
    closedBy!: User;

    @HasMany(() => StockMovement, {
        onDelete: "CASCADE",
    })
    stockMovements!: StockMovement[];
}
