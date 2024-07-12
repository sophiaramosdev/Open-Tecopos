import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
} from "sequelize-typescript";
import Business from "./business";
import Product from "./product";
import ProductReservationPolicy from "./productReservationPolicy ";

enum PolicyType {
    DISCOUNT = "DISCOUNT",
    CANCELATION = "CANCELATION",
    LONG_RESERVATION = "LONG_RESERVATION",
}

enum Frequency {
    DAYS = "days",
    WEEKS = "weeks",
    MONTHS = "months",
}
@Table
export default class ReservationPolicy extends Model {
    @Column
    type!: PolicyType;

    @Column({
        type: DataType.INTEGER,
    })
    quantity!: number;

    @Column({
        type: DataType.INTEGER,
    })
    durationInDays!: number;

    @Column
    frequency!: Frequency;

    @Column({
        type: DataType.FLOAT,
    })
    discount!: number;

    @Column({
        type: DataType.STRING,
    })
    description!: string;

    @Column
    createdAt?: Date;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @BelongsToMany(() => Product, {
        through: () => ProductReservationPolicy,
        foreignKey: "productId",
        otherKey: "reservationPolicyId",
    })
    products!: Product[];
}
