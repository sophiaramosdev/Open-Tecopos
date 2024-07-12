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
import { order_receipt_actions } from "../../interfaces/nomenclators";
import User from "./user";

@Table
export default class OrderReceiptRecord extends Model {
    @Column
    action!: order_receipt_actions;

    @Column
    title!: string;

    @Column({
        type: DataType.TEXT,
    })
    details!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isPublic!: boolean;

    //Relations
    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;

    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User, "madeById")
    madeBy?: User;
}
