import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Product from "./product";
import Area from "./area";

@Table
export default class ProductionArea extends Model {
    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @ForeignKey(() => Product)
    @Column
    productId!: number;
}
