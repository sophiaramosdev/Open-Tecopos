import {
    Table,
    Column,
    Model,
    DeletedAt,
    HasMany,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import Business from "./business";
import Resource from "./resource";

@Table
export default class Zone extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column
    code!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @HasMany(() => Resource)
    resources!: Resource[];

    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;
}
