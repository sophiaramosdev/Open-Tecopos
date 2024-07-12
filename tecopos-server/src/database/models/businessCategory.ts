import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    HasMany,
} from "sequelize-typescript";
import Business from "./business";

@Table
export default class BusinessCategory extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @HasMany(() => Business)
    businesses!: Business[];
}
