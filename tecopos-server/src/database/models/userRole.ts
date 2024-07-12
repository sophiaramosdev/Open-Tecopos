import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Role from "./role";
import User from "./user";

@Table
export default class UserRole extends Model {
    @ForeignKey(() => Role)
    @Column({
        unique: false,
    })
    roleId!: number;

    @ForeignKey(() => User)
    @Column({
        unique: false,
    })
    userId!: number;
}
