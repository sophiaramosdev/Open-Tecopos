import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    Scopes,
    DataType,
    HasMany,
} from "sequelize-typescript";

import Product from "./product";
import Price from "./price";
import BatchProductStockArea from "./batchProductStockArea";
import Business from "./business";
import Supplier from "./supplier";
import Variation from "./variation";
import BatchBuyedProduct from "./batchBuyedProduct";
import BuyedReceipt from "./buyedReceipt";
import BatchDispatchProduct from "./batchDispatchProduct";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "uniqueCode",
            "description",
            "entryAt",
            "measure",
            "expirationAt",
            "entryQuantity",
            "availableQuantity",
            "noPackages",
        ],
        include: [
            {
                model: BatchBuyedProduct,
                attributes: ["status", "quantity", "observations"],
            },
            {
                model: Product,
                attributes: ["id", "name"],
            },
            {
                model: Variation,
                attributes: ["id", "name"],
            },
            {
                model: Price,
                as: "grossCost",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "netCost",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "registeredPrice",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Business,
                attributes: ["id", "name"],
            },
        ],
    },
}))
export default class Batch extends Model {
    @Column
    uniqueCode!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column
    entryAt!: Date;

    @Column
    expirationAt!: Date;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    entryQuantity!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    availableQuantity!: number;

    @Column
    noPackages!: number;

    @Column
    universalCode!: number;

    @Column
    measure!: string;

    //Relations
    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => BuyedReceipt)
    @Column
    buyedReceiptId!: number;

    @BelongsTo(() => BuyedReceipt)
    buyedReceipt!: BuyedReceipt;

    @ForeignKey(() => Variation)
    @Column
    variationId!: number;

    @BelongsTo(() => Variation)
    variation!: Variation;

    @ForeignKey(() => Price)
    @Column
    grossCostId!: number;

    @BelongsTo(() => Price, "grossCostId")
    grossCost!: Price;

    @ForeignKey(() => Price)
    @Column
    netCostId!: number;

    @BelongsTo(() => Price, "netCostId")
    netCost!: Price;

    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @HasMany(() => BatchProductStockArea)
    stockAreas!: BatchProductStockArea[];

    @HasMany(() => BatchBuyedProduct)
    buyedProducts!: BatchBuyedProduct[];

    @HasMany(() => BatchDispatchProduct)
    dispatchProducts!: BatchDispatchProduct[];

    @ForeignKey(() => Supplier)
    @Column
    supplierId!: number;

    @BelongsTo(() => Supplier)
    supplier!: Supplier;

    @ForeignKey(() => Price)
    @Column
    registeredPriceId!: number;

    @BelongsTo(() => Price, "registeredPriceId")
    registeredPrice!: Price;
}
