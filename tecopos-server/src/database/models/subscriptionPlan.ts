import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    HasMany,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import Billing from "./billing";
import Business from "./business";
import Price from "./price";

@Table
export default class SubscriptionPlan extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    code!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @HasMany(() => Business)
    business!: Business[];

    @ForeignKey(() => Price)
    @Column
    priceId!: number;

    @BelongsTo(() => Price)
    price!: Price;

    @HasMany(() => Billing)
    billings!: Billing[];
}
