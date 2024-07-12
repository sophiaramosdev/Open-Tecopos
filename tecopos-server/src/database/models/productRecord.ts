import {
    Model,
    Table,
    Column,
    ForeignKey,
    BelongsTo,
    DataType,
} from "sequelize-typescript";

import Product from "./product";
import User from "./user";
import { product_actions_records } from "../../interfaces/nomenclators";

@Table
export default class ProductRecord extends Model {
    @Column
    action!: product_actions_records;

    @Column({
        defaultValue: new Date(),
    })
    registeredAt!: Date;

    @Column({
        type: DataType.TEXT,
        defaultValue: "",
    })
    oldValue!: string;

    @Column({
        type: DataType.TEXT,
        defaultValue: "",
    })
    newValue!: string;

    @Column({
        type: DataType.TEXT,
    })
    details!: string;

    // Relaciones
    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User, { foreignKey: "madeById" })
    madeByUser!: User;
}
