import { Table, Column, Model, DataType } from "sequelize-typescript";
import { temporal_tokens_types } from "../../interfaces/nomenclators";

@Table
export default class TemporalToken extends Model {
    @Column({
        type: DataType.INTEGER,
    })
    userId!: number;

    @Column({
        type: DataType.INTEGER,
    })
    businessId!: number;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    token!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    type!: temporal_tokens_types;

    @Column
    expiredAt!: Date;
}
