import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";
import Area from "./area";
import Business from "./business";
import User from "./user";
import Image from "./image";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "createdAt"],
        include: [
            {
                model: Area,
                attributes: ["id", "name"],
            },
            {
                model: Business,
                attributes: ["id", "name"],
            },
            {
                model: User,
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
        ],
    },
}))
export default class SharedArea extends Model {
    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    sharedBusinessId!: number;

    @BelongsTo(() => Business, "sharedBusinessId")
    sharedBusiness!: Business;

    @ForeignKey(() => User)
    @Column
    sharedById!: number;

    @BelongsTo(() => User, "sharedById")
    sharedBy?: User;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area, "areaId")
    area!: Area;
}
