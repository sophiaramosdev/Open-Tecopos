import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    DataType,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
    HasMany,
    Scopes,
} from "sequelize-typescript";
import Client from "./client";
import OrderReceipt from "./orderReceipt";
import CashRegisterOperation from "./cashRegisterOperation";
import {
    payments_ways,
    prepaidPayment_status,
} from "../../interfaces/nomenclators";
import Business from "./business";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "paymentNumber",
            "status",
            "amount",
            "description",
            "codeCurrency",
            "paymentWay",
            "createdAt",
        ],
        include: [
            {
                model: Client,
                attributes: [
                    "firstName",
                    "lastName",
                    "email",
                    "contractNumber",
                    "sex",
                    "type",
                    "registrationWay",
                    "birthAt",
                    "codeClient",
                ],
            },
            { model: CashRegisterOperation },
        ],
    },
}))
export default class PrepaidPayment extends Model {
    @Column({
        defaultValue: 1,
    })
    paymentNumber!: number;

    @Column
    status!: prepaidPayment_status;

    @Column({
        type: DataType.DECIMAL(10, 2),
        defaultValue: 0,
    })
    amount!: number;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column
    codeCurrency!: string;

    @Column
    paymentWay!: payments_ways;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    //Relation
    @ForeignKey(() => Client)
    @Column
    clientId!: number;

    @BelongsTo(() => Client)
    client!: Client;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    //cash
    @HasMany(() => CashRegisterOperation)
    cashRegisterOperations!: CashRegisterOperation[];

    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;
}
