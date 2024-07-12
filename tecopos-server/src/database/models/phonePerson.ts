import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Person from "./person";
import Phone from "./phone";

@Table
export default class PhonePerson extends Model {
    @ForeignKey(() => Person)
    @Column({
        unique: false,
    })
    personId!: number;

    @ForeignKey(() => Phone)
    @Column({
        unique: false,
    })
    phoneId!: number;
}
