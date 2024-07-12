import {
    Table,
    Column,
    Model,
    BelongsToMany,
    HasOne,
    ForeignKey,
    BelongsTo,
    DataType,
} from "sequelize-typescript";
import Business from "./business";
import StockMovement from "./stockMovement";
import DocTag from "./docTag";
import User from "./user";
import DocDocumentTag from "./docDocumentTag";
import Client from "./client";
import BuyedReceipt from "./buyedReceipt";
import DocumentBuyedReceipt from "./documentBuyedReceipt";

@Table
export default class Document extends Model {
    @Column({
        type: DataType.TEXT,
    })
    title!: string;

    @Column
    path!: string;

    @Column
    src!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @HasOne(() => StockMovement, { onDelete: "cascade" })
    stockMovement!: StockMovement;

    //new Model
    @ForeignKey(() => Client)
    @Column({
        onDelete: "CASCADE",
    })
    clientId!: number;

    @BelongsTo(() => Client, "clientId")
    client!: Client;

    @BelongsToMany(() => DocTag, {
        through: { model: () => DocDocumentTag, unique: false },
    })
    tags?: DocTag[];

    @BelongsToMany(() => BuyedReceipt, {
        through: { model: () => DocumentBuyedReceipt, unique: false },
    })
    buyedReceipts?: BuyedReceipt[];

    @ForeignKey(() => User)
    @Column
    uploadedById!: number;

    @BelongsTo(() => User)
    uploadedBy?: User;
}
