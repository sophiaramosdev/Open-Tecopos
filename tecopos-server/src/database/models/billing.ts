import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";

import Business from "./business";
import Price from "./price";
import { billing_status } from "../../interfaces/nomenclators";
import SubscriptionPlan from "./subscriptionPlan";
import User from "./user";

@Table
export default class Billing extends Model {
    @Column({
        defaultValue: "PENDING",
    })
    status!: billing_status;

    @Column
    invoiceNumber!: string;

    @Column
    observations!: string;

    @Column
    discount!: number;

    @Column
    nextPayment!: Date;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @ForeignKey(() => Price)
    @Column
    priceId!: number;

    @BelongsTo(() => Price)
    price!: Price;

    @ForeignKey(() => SubscriptionPlan)
    @Column
    subscriptionPlanId!: number;

    @BelongsTo(() => SubscriptionPlan)
    subscriptionPlan!: SubscriptionPlan;

    @ForeignKey(() => User)
    @Column
    registeredById!: number;

    @BelongsTo(() => User)
    registeredBy?: User;
}
