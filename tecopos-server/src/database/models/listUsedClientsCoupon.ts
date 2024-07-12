import {
    Table,
    Column,
    Model,
    ForeignKey,
    PrimaryKey,
    AutoIncrement,
} from "sequelize-typescript";

import Coupon from "./coupon";
import Client from "./client";

@Table
export default class ListUsedClientsCoupon extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column
    id!: number;

    @ForeignKey(() => Client)
    @Column
    clientId!: number;

    @ForeignKey(() => Coupon)
    @Column
    couponId!: number;
}
