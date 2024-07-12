import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    DataType,
} from "sequelize-typescript";
import Business from "./business";

@Table
export default class ConfigurationKey extends Model {
    @Column({
        allowNull: false,
    })
    key!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    value!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isSensitive!: boolean;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;
}
