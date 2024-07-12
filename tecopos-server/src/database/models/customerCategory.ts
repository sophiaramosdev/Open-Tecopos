import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    HasMany,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import Business from "./business";
import Client from "./client";

@Table
export default class CustomerCategory extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    //Relations
    @HasMany(() => Client)
    clients!: Client[];

    @ForeignKey(() => Business)
    @Column
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;
}
