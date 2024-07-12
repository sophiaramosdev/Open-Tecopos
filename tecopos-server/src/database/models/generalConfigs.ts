import { Table, Column, Model, DataType } from "sequelize-typescript";
import { app_origin } from "../../interfaces/nomenclators";

@Table
export default class GeneralConfigs extends Model {
    @Column({
        allowNull: false,
    })
    key!: string;

    @Column({
        allowNull: false,
    })
    value!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isSensitive!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isPublic!: boolean;

    @Column
    origin!: app_origin | "General";
}
