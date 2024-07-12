import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    Scopes,
    HasMany,
    HasOne,
} from "sequelize-typescript";
import Business from "./business";
import User from "./user";
import { access_point_status } from "../../interfaces/nomenclators";
import EconomicCycle from "./economicCycle";
import AccessPointProduct from "./accessPointProduct";
import Area from "./area";
import Image from "./image";
import OrderReceipt from "./orderReceipt";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "observations",
            "status",
            "createdAt",
            "managedAt",
            "referenceNumber",
        ],
        include: [
            {
                model: User,
                as: "madeBy",
                attributes: ["id", "email", "username", "displayName"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
                paranoid: false,
            },
            {
                model: User,
                as: "managedBy",
                attributes: ["id", "email", "username", "displayName"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
                paranoid: false,
            },
            {
                model: AccessPointProduct,
                attributes: ["id", "name", "quantity", "measure"],
                include: [
                    {
                        model: Image,
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
            },
            {
                model: Area,
                attributes: ["id", "name"],
            },
        ],
    },
}))
export default class AccessPointTicket extends Model {
    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.DATE,
    })
    managedAt!: Date;

    @Column({
        defaultValue: "CREATED",
    })
    status!: access_point_status;

    @Column
    name!: string;

    @Column
    referenceNumber!: string;

    @Column
    type!: "SALE" | "DISPATCH";

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
    madeById!: number;

    @BelongsTo(() => User, "madeById")
    madeBy!: User;

    @ForeignKey(() => User)
    @Column
    managedById!: number;

    @BelongsTo(() => User, "managedById")
    managedBy!: User;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;

    @HasMany(() => AccessPointProduct)
    products!: AccessPointProduct[];

    @HasOne(() => OrderReceipt)
    order!: OrderReceipt[];
}
