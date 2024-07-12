import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
    HasMany,
    Scopes,
} from "sequelize-typescript";
import { Op } from "sequelize";

import Area from "./area";
import Business from "./business";
import ProductAddon from "./productAddon";
import ProductCategory from "./productCategory";
import ProductManufacturation from "./productManufacturation";
import SalesCategory from "./salesCategory";
import SelledProduct from "./selledProduct";
import Supply from "./supply";
import StockAreaProduct from "./stockAreaProduct";
import StockMovement from "./stockMovement";
import { measureType, productType } from "../../interfaces/nomenclators";
import ProductPrice from "./productPrice";
import SelledProductAddon from "./selledProductAddon";
import ProductionArea from "./productionArea";
import Image from "./image";
import ImageProduct from "./imageProduct";
import Price from "./price";
import Combo from "./Combo";
import ProductAttribute from "./productAttribute";
import Variation from "./variation";
import DispatchProduct from "./dispatchProduct";
import ProductProductionOrder from "./productProductionOrder";
import AreaProductManufacturation from "./areaProductManufacturation";
import AccessPointProduct from "./accessPointProduct";
import ProductFixedCost from "./productFixedCost";
import Coupon from "./coupon";
import AllowedProductsCoupon from "./allowedProductsCoupon";
import ExcludedProductsCoupon from "./excludedProductsCoupon";
import Supplier from "./supplier";
import ProductRawRecipe from "./productRawRecipe";
import Recipe from "./recipe";
import Batch from "./batch";
import Resource from "./resource";
import ResourceProduct from "./productResource";
import ReservationPolicy from "./reservationPolicy";
import ProductReservationPolicy from "./productReservationPolicy ";
import Page from "./page";

@Table
@Scopes(() => ({
    to_return: {
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
            "isAlertable",
            "averagePreparationTime",
            "elaborationSteps",
            "averageCost",
            "salesCategoryId",
            "createdAt",
            "updatedAt",
            "universalCode",
            "showWhenOutStock",
            "showRemainQuantities",
            "visibleOnline",
            "externalId",
            "newArrival",
            "newArrivalAt",
            "isUnderAlertLimit",
            "saleByWeight",
            "enableDepreciation",
            "monthlyDepreciationRate",
            "groupName",
            "groupConvertion",
            "isWholesale",
            "minimunWholesaleAmount",
            "enableGroup",
            "performance",
            "onSaleType",
            "onSaleDiscountAmount",
            "duration",
            "hasDuration",
            "availableForReservation",
            "alwaysAvailableForReservation",
            "reservationAvailableFrom",
            "reservationAvailableTo",
            "color",
        ],
        include: [
            {
                model: ProductCategory,
                attributes: ["id", "name", "description"],
            },
            {
                model: SalesCategory,
                attributes: [
                    "id",
                    "name",
                    "description",
                    "externalId",
                    "color",
                ],
            },
            {
                model: Price,
                attributes: ["amount", "codeCurrency"],
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
                model: Supplier,
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: ProductPrice,
                attributes: [
                    "id",
                    "price",
                    "codeCurrency",
                    "isMain",
                    "priceSystemId",
                    "updatedAt",
                ],
                separate: true,
            },
            {
                model: Product,
                as: "availableAddons",
                attributes: [
                    "id",
                    "name",
                    "salesCode",
                    "description",
                    "stockLimit",
                    "totalQuantity",
                ],
                through: {
                    attributes: [],
                },
                include: [
                    {
                        model: ProductPrice,
                        attributes: [
                            "price",
                            "codeCurrency",
                            "isMain",
                            "priceSystemId",
                        ],
                        separate: true,
                    },
                    {
                        model: Image,
                        as: "images",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                        through: {
                            attributes: [],
                        },
                    },
                ],
                required: false,
                where: {
                    [Op.or]: [
                        {
                            stockLimit: false,
                        },
                        {
                            stockLimit: true,
                            totalQuantity: {
                                [Op.gt]: 0,
                            },
                        },
                    ],
                },
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
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                        through: {
                            attributes: [],
                        },
                    },
                ],
            },
            {
                model: Area,
                as: "listProductionAreas",
                attributes: ["id", "name"],
                through: {
                    attributes: [],
                },
                paranoid: false,
            },
            {
                model: ProductFixedCost,
                attributes: ["id", "costAmount", "description"],
            },
            {
                model: Supply,
                attributes: ["id", "quantity"],
                as: "supplies",
                separate: true,
                include: [
                    {
                        attributes: [
                            "id",
                            "name",
                            "averageCost",
                            "measure",
                            "type",
                        ],
                        model: Product,
                        as: "supply",
                    },
                ],
            },
            {
                model: Combo,
                attributes: ["id", "quantity", "variationId"],
                as: "compositions",
                separate: true,
                include: [
                    {
                        attributes: [
                            "id",
                            "name",
                            "averageCost",
                            "measure",
                            "type",
                        ],
                        model: Product,
                        as: "composed",
                    },
                    { model: Variation, attributes: ["id", "name"] },
                ],
            },
            {
                model: Recipe,
                attributes: [
                    "id",
                    "name",
                    "measure",
                    "unityToBeProduced",
                    "realPerformance",
                    "totalCost",
                    "unityToBeProducedCost",
                ],
            },
            {
                model: Variation,
                attributes: ["id", "name", "description", "onSale"],
                as: "variations",
                separate: true,
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
                        attributes: ["id", "name", "code", "value"],
                        through: {
                            attributes: [],
                        },
                    },
                ],
                required: false,
            },
            {
                model: ProductAttribute,
                attributes: ["id", "name", "code", "value"],
                separate: true,
            },
            {
                model: Resource,
                through: {
                    attributes: [],
                },
            },
        ],
    },
}))
export default class Product extends Model {
    @Column
    externalId!: number;

    @Column
    name!: string;

    @Column
    salesCode!: string;

    @Column
    universalCode!: number;

    @Column
    color!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    hasDuration?: boolean;

    @Column
    duration?: string;

    @Column({
        type: DataType.TEXT,
    })
    promotionalText!: string;

    @Column({
        defaultValue: "STOCK",
    })
    type!: productType;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    newArrival!: boolean;

    @Column
    newArrivalAt!: Date;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    showForSale!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    saleByWeight!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isManufacturable!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    stockLimit!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    indexableToSaleOnline!: boolean;

    @Column
    qrCode!: string;

    @Column
    barCode!: string;

    @Column
    enableGroup!: boolean;

    @Column
    groupName!: string;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 1,
    })
    groupConvertion!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 1,
    })
    performance!: number;

    @Column
    isWholesale!: boolean;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 1,
    })
    minimunWholesaleAmount!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    totalQuantity!: number;

    @Column
    measure!: measureType;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    suggested!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    onSale!: boolean;

    @Column
    onSaleType!: "fixed" | "percent";

    @Column({
        type: DataType.FLOAT,
    })
    onSaleDiscountAmount!: number;

    @Column({
        type: DataType.FLOAT,
    })
    alertLimit!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isAlertable!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isUnderAlertLimit!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isPublicVisible!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isAccountable!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    visibleOnline!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    showWhenOutStock!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    showRemainQuantities!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    enableDepreciation!: boolean;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    monthlyDepreciationRate!: number;

    @Column({
        type: DataType.INTEGER,
    })
    averagePreparationTime!: number;

    @Column({
        type: DataType.TEXT,
    })
    elaborationSteps!: string;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    averageCost!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isCostDefined!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    availableForReservation!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    alwaysAvailableForReservation!: boolean;

    @Column({
        type: DataType.DATE,
    })
    reservationAvailableFrom?: Date;

    @Column({
        type: DataType.DATE,
    })
    reservationAvailableTo?: Date;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @ForeignKey(() => SalesCategory)
    @Column
    salesCategoryId!: number;

    @BelongsTo(() => SalesCategory)
    salesCategory!: SalesCategory;

    @ForeignKey(() => ProductCategory)
    @Column
    productCategoryId!: number;

    @BelongsTo(() => ProductCategory)
    productCategory!: ProductCategory;

    @HasMany(() => SelledProductAddon)
    selledAddonsProducts?: SelledProductAddon[];

    @HasMany(() => SelledProduct)
    selledProducts!: SelledProduct[];

    @HasMany(() => ProductProductionOrder)
    productsProductionOrder!: ProductProductionOrder[];

    @HasMany(() => DispatchProduct)
    dispatchedProducts!: DispatchProduct[];

    @HasMany(() => AccessPointProduct)
    accessPointProducts!: AccessPointProduct[];

    @HasMany(() => ProductRawRecipe)
    productsRawRecipe!: ProductRawRecipe[];

    @BelongsToMany(() => Product, {
        through: { model: () => ProductManufacturation, unique: false },
        foreignKey: "manufacturedProductId",
    })
    bases?: Product[];

    @BelongsToMany(() => Product, {
        through: { model: () => ProductManufacturation, unique: false },
        foreignKey: "baseProductId",
    })
    listManufacturations?: Product[];

    @BelongsToMany(() => Product, {
        through: { model: () => ProductAddon, unique: false },
        foreignKey: "baseProductId",
    })
    availableAddons?: Product[];

    @BelongsToMany(() => Area, {
        foreignKey: "manufacturerAreaId",
        through: { model: () => AreaProductManufacturation, unique: false },
    })
    areasWithManufacturations?: Area[];

    @BelongsToMany(() => Product, {
        through: { model: () => ProductAddon, unique: false },
        foreignKey: "addonId",
    })
    listProductAddons?: Product[];

    @BelongsToMany(() => Area, {
        through: { model: () => ProductionArea, unique: false },
        foreignKey: "productId",
    })
    listProductionAreas?: Area[];

    @HasMany(() => Supply, "supplyId")
    baseProducts!: Supply[];

    @HasMany(() => ProductFixedCost)
    fixedCosts!: ProductFixedCost[];

    @HasMany(() => Supply, "baseProductId")
    supplies!: Supply[];

    @HasMany(() => StockAreaProduct)
    stockAreaProducts?: StockAreaProduct[];

    @HasMany(() => StockMovement, "productId")
    stockMovements?: StockMovement[];

    @HasMany(() => ProductPrice)
    prices!: ProductPrice[];

    @HasMany(() => ProductAttribute)
    attributes!: ProductAttribute[];

    @HasMany(() => Page)
    pages!: Page[];

    @HasMany(() => Variation)
    variations!: Variation[];

    @BelongsToMany(() => Image, {
        through: { model: () => ImageProduct, unique: false },
    })
    images?: Image[];

    @ForeignKey(() => Price)
    @Column
    onSalePriceId!: number;

    @BelongsTo(() => Price)
    onSalePrice!: Price;

    @HasMany(() => Combo, "composedId")
    comboBaseProducts!: Combo[];

    @HasMany(() => Combo, "comboBaseProductId")
    compositions!: Combo[];

    @HasMany(() => Batch)
    batchs!: Batch[];

    @BelongsToMany(() => Coupon, {
        as: "allowedProducts",
        through: { model: () => AllowedProductsCoupon, unique: false },
    })
    allowedCoupons?: Coupon[];

    @BelongsToMany(() => Coupon, {
        as: "excludedProducts",
        through: { model: () => ExcludedProductsCoupon, unique: false },
    })
    excludedCoupons?: Coupon[];

    @ForeignKey(() => Supplier)
    @Column
    supplierId!: number;

    @BelongsTo(() => Supplier)
    supplier?: Supplier;

    @ForeignKey(() => Recipe)
    @Column
    recipeId!: number;

    @BelongsTo(() => Recipe)
    recipe?: Recipe;

    @BelongsToMany(() => Resource, {
        through: () => ResourceProduct,
        foreignKey: "productId",
        otherKey: "resourceId",
    })
    resources?: Resource[];

    @BelongsToMany(() => ReservationPolicy, {
        through: () => ProductReservationPolicy,
        foreignKey: "productId",
        otherKey: "reservationPolicyId",
    })
    reservationPolicies!: ReservationPolicy[];
}
