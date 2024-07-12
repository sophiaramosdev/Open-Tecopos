import { Table, Column, Model, ForeignKey } from "sequelize-typescript";
import Image from "./image";
import Area from "./area";

@Table
export default class ImageArea extends Model {
    @ForeignKey(() => Area)
    @Column({
        unique: false,
    })
    areaId!: number;

    @ForeignKey(() => Image)
    @Column({
        unique: false,
    })
    imageId!: number;
}
