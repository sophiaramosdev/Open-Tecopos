import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    DataType,
    Scopes,
} from "sequelize-typescript";
import BuyedReceipt from "./buyedReceipt";
import FixedCostCategory from "./fixedCostCategory";
import Price from "./price";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "costAmount", "description"],
        include: [
            {
                model: FixedCostCategory,
                attributes: ["id", "name", "description"],
            },
        ],
    },
}))
export default class BuyedReceiptFixedCost extends Model {
    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    costAmount!: number;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @ForeignKey(() => BuyedReceipt)
    @Column
    buyedReceiptId!: number;

    @BelongsTo(() => BuyedReceipt)
    buyedReceipt!: BuyedReceipt;

    @ForeignKey(() => FixedCostCategory)
    @Column
    fixedCostCategoryId!: number;

    @BelongsTo(() => FixedCostCategory)
    fixedCostCategory!: FixedCostCategory;

    @ForeignKey(() => Price)
    @Column
    registeredPriceId!: number;

    @BelongsTo(() => Price)
    registeredPrice!: Price;
}
