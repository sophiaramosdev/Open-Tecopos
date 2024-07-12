import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import User from "./user";
import Address from "./address";

@Table
export default class ListUserAddress extends Model {
    @ForeignKey(() => Address)
    @Column
    addressId!: number;

    @ForeignKey(() => User)
    @Column
    userId!: number;
}
