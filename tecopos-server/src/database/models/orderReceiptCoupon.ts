import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import OrderReceipt from "./orderReceipt";
import Coupon from "./coupon";

@Table
export default class OrderReceiptCoupon extends Model {
    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @ForeignKey(() => Coupon)
    @Column
    couponId!: number;
}
