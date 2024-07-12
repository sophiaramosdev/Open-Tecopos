import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Coupon from "./coupon";
import Client from "./client";

@Table
export default class ListAllowedClientsCoupon extends Model {
    @ForeignKey(() => Client)
    @Column
    clientId!: number;

    @ForeignKey(() => Coupon)
    @Column
    couponId!: number;
}
