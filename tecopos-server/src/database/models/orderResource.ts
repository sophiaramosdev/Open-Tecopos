import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Resource from "./resource";
import OrderReceipt from "./orderReceipt";

@Table
export default class OrderResource extends Model {
    @ForeignKey(() => Resource)
    @Column
    resourceId!: number;

    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;
}
