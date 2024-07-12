import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Area from "./area";
import User from "./user";

@Table
export default class AllowedStockUserArea extends Model {
    @ForeignKey(() => Area)
    @Column
    stockAreaId!: number;

    @ForeignKey(() => User)
    @Column
    userId!: number;
}
