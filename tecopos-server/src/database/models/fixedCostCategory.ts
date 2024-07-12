import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "description", "createdAt"],
    },
}))
export default class FixedCostCategory extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

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
}
