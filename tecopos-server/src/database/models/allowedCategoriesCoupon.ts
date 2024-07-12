import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Coupon from "./coupon";
import SalesCategory from "./salesCategory";

@Table
export default class AllowedCategoriesCoupon extends Model {
    @ForeignKey(() => SalesCategory)
    @Column
    salesCategoryId!: number;

    @ForeignKey(() => Coupon)
    @Column
    couponId!: number;
}
