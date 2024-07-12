import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Area from "./area";
import User from "./user";

@Table
export default class AllowedSaleUserArea extends Model {
    @ForeignKey(() => Area)
    @Column
    saleAreaId!: number;

    @ForeignKey(() => User)
    @Column
    userId!: number;
}
