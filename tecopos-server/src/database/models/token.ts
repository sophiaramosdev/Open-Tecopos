import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table
export default class Token extends Model {
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    userId!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    token!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    origin!: string;
}
