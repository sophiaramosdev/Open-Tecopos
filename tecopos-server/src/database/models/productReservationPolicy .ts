import { Column, ForeignKey,Model, Table } from "sequelize-typescript";
import Product from "./product";
import ReservationPolicy from "./reservationPolicy";

@Table
export default class ProductReservationPolicy extends Model {
    @ForeignKey(() => Product)
    @Column({
        unique: false,
    })
    productId!: number;

    @ForeignKey(() => ReservationPolicy)
    @Column({
        unique: false,
    })
    reservationPolicyId!: number;
}
