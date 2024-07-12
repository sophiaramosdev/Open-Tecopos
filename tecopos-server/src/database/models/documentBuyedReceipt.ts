import { Table, Column, Model, ForeignKey } from "sequelize-typescript";
import Document from "./document";
import BuyedReceipt from "./buyedReceipt";

@Table
export default class DocumentBuyedReceipt extends Model {
    @ForeignKey(() => BuyedReceipt)
    @Column({
        unique: false,
    })
    buyedReceiptId!: number;

    @ForeignKey(() => Document)
    @Column({
        unique: false,
    })
    documentId!: number;
}
