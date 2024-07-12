import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import { payments_ways } from "../../interfaces/nomenclators";

import OrderReceipt from "./orderReceipt";

@Table
export default class CurrencyPayment extends Model {
    @Column({
        type: DataType.FLOAT,
        allowNull: false,
    })
    amount!: number;

    @Column({
        allowNull: false,
    })
    codeCurrency!: string;

    @Column
    paymentWay!: payments_ways;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;
}
