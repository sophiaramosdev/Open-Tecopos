import {
    Table,
    Column,
    Model,
    DataType,
    Scopes,
    HasMany,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import Page from "./page";
import Image from "./image";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "meta",
            "code",
            "description",
            "createdAt",
            "isActive",
            "orientation",
        ],
        include: [
            {
                model: Image,
                as: "cover",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
        ],
    },
}))
export default class Template extends Model {
    @Column({
        defaultValue: 0,
    })
    orientation!: number;

    @Column
    name!: string;

    @Column({
        allowNull: false,
    })
    code!: string;

    @Column({
        type: DataType.TEXT,
    })
    structure!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @HasMany(() => Page)
    pages!: Page[];

    @ForeignKey(() => Image)
    @Column
    coverId!: number;

    @BelongsTo(() => Image)
    cover!: Image;
}
