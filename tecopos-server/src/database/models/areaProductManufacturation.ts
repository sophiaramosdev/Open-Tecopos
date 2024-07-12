import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Area from "./area";
import Product from "./product";

@Table
export default class AreaProductManufacturation extends Model {
    @ForeignKey(() => Area)
    @Column
    manufacturerAreaId!: number;

    @ForeignKey(() => Product)
    @Column
    productId!: number;
}
