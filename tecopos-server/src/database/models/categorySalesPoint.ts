import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Area from "./area";
import SalesCategory from "./salesCategory";

@Table
export default class CategorySalesPoint extends Model {
    @ForeignKey(() => SalesCategory)
    @Column({
        unique: false,
    })
    salesCategoryId!: number;

    @ForeignKey(() => Area)
    @Column({
        unique: false,
    })
    areaId!: number;
}
