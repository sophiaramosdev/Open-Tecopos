import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
} from "sequelize-typescript";
import OrderReceipt from "./orderReceipt";

@Table
export default class OrderReceiptPrice extends Model {
    @Column({
        allowNull: false,
        type: DataType.FLOAT,
    })
    price!: number;

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
