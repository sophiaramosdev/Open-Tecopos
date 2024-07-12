import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    HasMany,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";
import Area from "./area";
import OrderReceipt from "./orderReceipt";
import SelledProduct from "./selledProduct";
import User from "./user";
import Image from "./image";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "status", "productionNumber", "createdAt"],
        include: [
            {
                model: User,
                attributes: ["id", "username", "displayName"],
                paranoid: false,
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
            },
        ],
    },
    details: {
        attributes: ["id", "name", "status", "productionNumber", "createdAt"],
        include: [
            {
                model: User,
                attributes: ["id", "username", "displayName"],
                paranoid: false,
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
            },
            {
                model: Area,
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: SelledProduct,
                as: "selledProducts",
                attributes: [
                    "id",
                    "name",
                    "quantity",
                    "status",
                    "colorCategory",
                ],
            },
        ],
    },
}))
export default class ProductionTicket extends Model {
    @Column({
        defaultValue: "RECEIVED",
    })
    status!: "RECEIVED" | "IN_PROCESS" | "DISPATCHED" | "CLOSED";

    @Column({
        type: DataType.TEXT,
    })
    name!: string;

    @Column({
        defaultValue: 1,
    })
    productionNumber!: number;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;

    @ForeignKey(() => User)
    @Column
    preparedById!: number;

    @BelongsTo(() => User)
    preparedBy!: User;

    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;

    @HasMany(() => SelledProduct)
    selledProducts!: SelledProduct[];
}
