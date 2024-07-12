import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    Scopes,
} from "sequelize-typescript";

import Area from "./area";
import Product from "./product";
import StockAreaVariation from "./stockAreaVariation";
import { stockAreaProductType } from "../../interfaces/nomenclators";
import Image from "./image";
import ProductCategory from "./productCategory";
import SalesCategory from "./salesCategory";
import ProductPrice from "./productPrice";
import { Op } from "sequelize";
import BatchProductStockArea from "./batchProductStockArea";

@Table
@Scopes(() => ({
    to_production: {
        attributes: ["id", "quantity", "productId"],
        include: [
            {
                model: Product,
                attributes: [
                    "id",
                    "name",
                    "type",
                    "measure",
                    "averagePreparationTime",
                    "barCode",
                ],
                include: [
                    {
                        model: Image,
                        as: "images",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                        through: {
                            attributes: [],
                        },
                    },
                    {
                        model: ProductCategory,
                        attributes: ["id", "name", "description"],
                    },
                ],
            },
        ],
    },
    to_stock: {
        attributes: ["id", "quantity", "productId"],
        include: [
            {
                model: Product,
                attributes: ["id", "name", "type", "measure", "barCode"],
                include: [
                    {
                        model: Image,
                        as: "images",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                        through: {
                            attributes: [],
                        },
                    },
                    {
                        model: ProductCategory,
                        attributes: ["id", "name", "description"],
                    },
                ],
            },
        ],
    },
    to_return: {
        attributes: ["id", "quantity", "productId", "type"],
        include: [
            {
                model: Product,
                attributes: [
                    "id",
                    "name",
                    "salesCode",
                    "description",
                    "promotionalText",
                    "type",
                    "showForSale",
                    "stockLimit",
                    "qrCode",
                    "barCode",
                    "totalQuantity",
                    "measure",
                    "suggested",
                    "onSale",
                    "alertLimit",
                    "isPublicVisible",
                    "averagePreparationTime",
                    "elaborationSteps",
                    "averageCost",
                    "businessId",
                ],
                include: [
                    {
                        model: ProductCategory,
                        attributes: ["id", "name", "description"],
                    },
                    {
                        model: SalesCategory,
                        attributes: ["id", "name", "description", "color"],
                    },
                    {
                        model: Product,
                        as: "listManufacturations",
                        attributes: ["id", "name", "description", "measure"],
                        through: {
                            attributes: [],
                        },
                        include: [
                            {
                                model: Image,
                                as: "images",
                                attributes: [
                                    "id",
                                    "src",
                                    "thumbnail",
                                    "blurHash",
                                ],
                                through: {
                                    attributes: [],
                                },
                            },
                        ],
                    },
                    {
                        model: Image,
                        as: "images",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                        through: {
                            attributes: [],
                        },
                    },
                    {
                        model: ProductPrice,
                        attributes: [
                            "price",
                            "codeCurrency",
                            "isMain",
                            "priceSystemId",
                        ],
                    },
                ],
            },
        ],
    },
    to_sale_area: {
        include: [
            {
                model: Product.scope("to_return"),
                where: {
                    showForSale: true,
                    totalQuantity: {
                        [Op.gt]: 0,
                    },
                },
            },
        ],
    },
}))
export default class StockAreaProduct extends Model {
    @Column({
        type: DataType.FLOAT,
        allowNull: false,
    })
    quantity!: number;

    @Column
    type!: stockAreaProductType;

    //Relations
    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;

    @HasMany(() => StockAreaVariation)
    variations!: StockAreaVariation[];

    @HasMany(() => BatchProductStockArea)
    batchs!: BatchProductStockArea[];
}
