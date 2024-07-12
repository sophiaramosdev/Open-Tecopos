import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    HasMany,
} from "sequelize-typescript";
import AvailableCurrency from "./availableCurrency";

@Table
export default class Currency extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    code!: string;

    @Column
    symbol!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @HasMany(() => AvailableCurrency)
    businessCurrencies!: AvailableCurrency[];
}
