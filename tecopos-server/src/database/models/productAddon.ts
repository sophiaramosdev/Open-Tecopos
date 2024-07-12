import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Product from "./product";

@Table
export default class ProductAddon extends Model {
    @ForeignKey(() => Product)
    @Column
    addonId!: number;

    @ForeignKey(() => Product)
    @Column
    baseProductId!: number;
}
