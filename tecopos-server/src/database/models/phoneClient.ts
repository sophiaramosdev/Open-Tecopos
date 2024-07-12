import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Phone from "./phone";
import Client from "./client";

@Table
export default class PhoneClient extends Model {
    @ForeignKey(() => Client)
    @Column({
        unique: false,
    })
    clientId!: number;

    @ForeignKey(() => Phone)
    @Column({
        unique: false,
    })
    phoneId!: number;
}
