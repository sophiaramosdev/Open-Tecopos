import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Phone from "./phone";
import Supplier from "./supplier";

@Table
export default class PhoneSupplier extends Model {
    @ForeignKey(() => Supplier)
    @Column({
        unique: false,
    })
    supplierId!: number;

    @ForeignKey(() => Phone)
    @Column({
        unique: false,
    })
    phoneId!: number;
}
