import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Area from "./area";
import User from "./user";

@Table
export default class AllowedAccessPointUserArea extends Model {
    @ForeignKey(() => Area)
    @Column
    accessPointAreaId!: number;

    @ForeignKey(() => User)
    @Column
    userId!: number;
}
