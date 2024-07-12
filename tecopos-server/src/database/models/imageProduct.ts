import { Table, Column, Model, ForeignKey } from "sequelize-typescript";
import Product from "./product";
import Image from "./image";

@Table
export default class ImageProduct extends Model {
    @ForeignKey(() => Product)
    @Column({
        unique: false,
    })
    productId!: number;

    @ForeignKey(() => Image)
    @Column({
        unique: false,
    })
    imageId!: number;
}
