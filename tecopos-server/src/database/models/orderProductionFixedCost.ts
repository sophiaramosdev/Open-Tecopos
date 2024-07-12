import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
    Scopes,
} from "sequelize-typescript";
import Product from "./product";
import ProductionOrder from "./productionOrder";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "costAmount", "description"],
    },
}))
export default class OrderProductionFixedCost extends Model {
    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    costAmount!: number;

    @Column
    description!: string;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    @ForeignKey(() => ProductionOrder)
    @Column
    productionOrderId!: number;

    @BelongsTo(() => ProductionOrder)
    productionOrder!: ProductionOrder;
}
