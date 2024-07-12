import { Table, Column, Model, ForeignKey } from "sequelize-typescript";

import Variation from "./variation";
import ProductAttribute from "./productAttribute";

@Table
export default class VariationProductAttribute extends Model {
    @ForeignKey(() => Variation)
    @Column
    variationId!: number;

    @ForeignKey(() => ProductAttribute)
    @Column
    productAttributeId!: number;
}
