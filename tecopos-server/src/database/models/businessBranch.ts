import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Business from "./business";

@Table
export default class BusinessBranch extends Model {
    @ForeignKey(() => Business)
    @Column
    branchId!: number;

    @ForeignKey(() => Business)
    @Column
    businessBaseId!: number;
}
