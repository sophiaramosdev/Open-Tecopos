import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Area from "./area";
import User from "./user";

@Table
export default class AllowedManufacturerUserArea extends Model {
    @ForeignKey(() => Area)
    @Column
    manufacturerAreaId!: number;

    @ForeignKey(() => User)
    @Column
    userId!: number;
}
