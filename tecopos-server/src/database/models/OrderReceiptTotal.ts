import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    DataType,
} from "sequelize-typescript";
import OrderReceipt from "./orderReceipt";

@Table
export default class OrderReceiptTotal extends Model {
    @Column({
        allowNull: false,
        type: DataType.FLOAT,
    })
    amount!: number;

    @Column({
        allowNull: false,
    })
    codeCurrency!: string;

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
