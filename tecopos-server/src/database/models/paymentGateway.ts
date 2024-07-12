import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    BelongsToMany,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";
import OrderReceipt from "./orderReceipt";
import { payments_ways } from "../../interfaces/nomenclators";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "externalId",
            "code",
            "name",
            "description",
            "isActive",
            "paymentWay",
        ],
    },
}))
export default class PaymentGateway extends Model {
    @Column
    externalId!: string;

    @Column
    code!: string;

    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column
    paymentWay!: payments_ways;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @HasMany(() => OrderReceipt)
    orders!: OrderReceipt[];
}
