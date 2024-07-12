import {
    Table,
    Column,
    Model,
    ForeignKey,
    PrimaryKey,
    AutoIncrement,
} from "sequelize-typescript";

import Product from "./product";

@Table
export default class ProductManufacturation extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column
    id!: number;

    @ForeignKey(() => Product)
    @Column({
        unique: false,
    })
    manufacturedProductId!: number;

    @ForeignKey(() => Product)
    @Column({
        unique: false,
    })
    baseProductId!: number;
}
