import { Table, Column, Model, ForeignKey } from "sequelize-typescript";
import Image from "./image";
import Business from "./business";

@Table
export default class ImageBusiness extends Model {
    @ForeignKey(() => Business)
    @Column({
        unique: false,
    })
    businessId!: number;

    @ForeignKey(() => Image)
    @Column({
        unique: false,
    })
    imageId!: number;
}
