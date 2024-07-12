import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Coupon from "./coupon";
import Product from "./product";

@Table
export default class AllowedProductsCoupon extends Model {
    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @ForeignKey(() => Coupon)
    @Column
    couponId!: number;
}
