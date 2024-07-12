import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    HasOne,
    BelongsToMany,
    DataType,
    Scopes,
    HasMany,
} from "sequelize-typescript";

import Image from "./image";
import Price from "./price";
import Product from "./product";
import SelledProduct from "./selledProduct";
import StockMovement from "./stockMovement";
import StockAreaVariation from "./stockAreaVariation";
import VariationProductAttribute from "./variationProductAttribute";
import ProductAttribute from "./productAttribute";
import Combo from "./Combo";
import DispatchProduct from "./dispatchProduct";
import Batch from "./batch";
import BatchProductStockArea from "./batchProductStockArea";
import BatchBuyedProduct from "./batchBuyedProduct";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "description", "onSale", "name"],
        include: [
            {
                model: Price,
                as: "price",
                attributes: ["codeCurrency", "amount"],
            },
            {
                model: Price,
                as: "onSalePrice",
                attributes: ["codeCurrency", "amount"],
            },
            {
                model: Image,
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: ProductAttribute,
                attributes: ["name", "code", "value"],
                through: {
                    attributes: [],
                },
            },
        ],
    },
}))
export default class Variation extends Model {
    @Column
    description!: string;

    @Column
    externalId!: number;

    @Column
    name!: string;

    @Column
    barCode!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    onSale!: boolean;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => Price)
    @Column
    priceId!: number;

    @BelongsTo(() => Price, "priceId")
    price!: Price;

    @ForeignKey(() => Price)
    @Column
    onSalePriceId!: number;

    @BelongsTo(() => Price, "onSalePriceId")
    onSalePrice!: Price;

    @ForeignKey(() => Image)
    @Column
    imageId!: number;

    @BelongsTo(() => Image)
    image!: Image;

    @HasMany(() => SelledProduct)
    selledProducts!: SelledProduct[];

    @HasMany(() => StockAreaVariation)
    stockAreaVariations!: StockAreaVariation[];

    @HasMany(() => StockMovement)
    stockMovements!: StockMovement[];

    @HasMany(() => Combo)
    comboProducts!: Combo[];

    @HasMany(() => Batch)
    batches!: Batch[];

    @HasMany(() => BatchProductStockArea)
    batchStockAreas!: BatchProductStockArea[];

    @HasMany(() => BatchBuyedProduct)
    batchBuyedProducts!: BatchBuyedProduct[];

    @HasMany(() => DispatchProduct)
    dispatchProducts!: DispatchProduct[];

    @BelongsToMany(() => ProductAttribute, {
        as: "attributes",
        through: { model: () => VariationProductAttribute, unique: false },
    })
    attributes?: ProductAttribute[];
}
