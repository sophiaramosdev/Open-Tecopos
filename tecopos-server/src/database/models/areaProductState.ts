import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Area from "./area";
import ProductState from "./productState";

@Table
export default class AreaProductState extends Model {
    @ForeignKey(() => Area)
    @Column({
        unique: false,
    })
    areaId!: number;

    @ForeignKey(() => ProductState)
    @Column({
        unique: false,
    })
    productStateId!: number;
}
