import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Business from "./business";
import Phone from "./phone";

@Table
export default class PhoneBusiness extends Model {
    @ForeignKey(() => Business)
    @Column({
        unique: false,
    })
    businessId!: number;

    @ForeignKey(() => Phone)
    @Column
    phoneId!: number;
}
