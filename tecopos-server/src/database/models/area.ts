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

import Business from "./business";
import Resource from "./resource";
import SelledProduct from "./selledProduct";
import User from "./user";
import Product from "./product";
import StockAreaProduct from "./stockAreaProduct";
import StockMovement from "./stockMovement";
import OrderReceipt from "./orderReceipt";
import ProductionTicket from "./productionTicket";
import SalesCategory from "./salesCategory";
import CategorySalesPoint from "./categorySalesPoint";
import AllowedStockUserArea from "./allowedStockUserArea";
import AllowedSaleUserArea from "./allowedSaleUserArea";
import AllowedManufacturerUserArea from "./allowedManufacturerUserArea";
import ProductionArea from "./productionArea";
import CashRegisterOperation from "./cashRegisterOperation";
import Account from "./account";
import Image from "./image";
import ImageArea from "./imageArea";
import {
    access_mode,
    area_types,
    production_mode,
} from "../../interfaces/nomenclators";
import Dispatch from "./dispatch";
import SharedArea from "./sharedArea";
import ProductState from "./productState";
import AreaProductManufacturation from "./areaProductManufacturation";
import AllowedAccessPointUserArea from "./allowedAccessPointUserArea";
import AccessPointTicket from "./accessPointTicket";
import AreaProductState from "./areaProductState";
import AccountTag from "./accountTag";
import FundDestination from "./fundDestination";
import Store from "./store";
import ProductionOrder from "./productionOrder";
import PersonAccessRecord from "./personAccessRecord";
import BuyedReceipt from "./buyedReceipt";
import Modifier from "./modifier";
import Price from "./price";

@Table
@Scopes(() => ({
    SALE: {
        attributes: [
            "id",
            "name",
            "code",
            "description",
            "type",
            "isActive",
            "isPublicVisible",
            "saleByCategory",
            "saleOnlyMyStock",
            "salaryPercent",
            "salaryFixed",
            "enablePercentAfter",
            "enableSalaryByPercent",
            "stockAreaId",
            "createAccessPointTicket",
            "accountId",
            "transferFoundsAfterClose",
            "allowProductsMultiprice",
            "allowManualPrice",
            "defaultPaymentMethod",
            "defaultPaymentCurrency",
            "enforceCurrency",
            "availableCodeCurrency",
            "enforcedCommission",
            "giveChangeWith",
            "fixedCommission",
            "fixedDiscount",
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
                model: Area,
                as: "stockArea",
                attributes: ["id", "name"],
            },
            {
                model: Account,
                attributes: ["id", "name", "code"],
            },
            {
                model: AccountTag,
                attributes: ["id", "name", "code"],
            },
            {
                model: SalesCategory,
                attributes: ["id", "name"],
                through: { attributes: [] },
                include: [
                    {
                        model: Image,
                        attributes: ["src", "thumbnail", "blurHash"],
                    },
                ],
            },
            {
                model: FundDestination,
                attributes: ["id", "codeCurrency", "paymentWay", "default"],
                include: [
                    {
                        model: Account,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: AccountTag,
                        attributes: ["id", "name", "code"],
                    },
                ],
            },
            {
                model: Business,
                attributes: ["name"],
            },
            {
                model: Modifier,
                attributes: [
                    "id",
                    "name",
                    "type",
                    "amount",
                    "active",
                    "index",
                    "applyToGrossSales",
                    "applyAcumulative",
                    "applyFixedAmount",
                    "showName",
                    "observations",
                ],
                include: [
                    {
                        model: Price,
                        attributes: ["amount", "codeCurrency"],
                    },
                ],
            },
        ],
    },
    STOCK: {
        attributes: [
            "id",
            "name",
            "code",
            "description",
            "type",
            "isActive",
            "isPublicVisible",
            "isMainStock",
            "allowDirectlyMovements",
            "productionOrderController",
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
                model: Business,
                attributes: ["name"],
            },
        ],
    },
    ACCESSPOINT: {
        attributes: [
            "id",
            "name",
            "code",
            "description",
            "type",
            "isActive",
            "isPublicVisible",
            "accessMode",
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
                model: Business,
                attributes: ["name"],
            },
        ],
    },
    MANUFACTURER: {
        attributes: [
            "id",
            "name",
            "code",
            "description",
            "type",
            "isActive",
            "isPublicVisible",
            "stockAreaId",
            "productionMode",
            "limitProductProduction",
            "limitProductionToOrderProduction",
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
                model: Area,
                as: "stockArea",
                attributes: ["id", "name"],
            },
            {
                model: Area,
                as: "initialStock",
                attributes: ["id", "name"],
            },
            {
                model: Area,
                as: "endStock",
                attributes: ["id", "name"],
            },
            {
                model: Product,
                as: "listManufacturations",
                attributes: ["id", "name", "type", "measure"],
                through: {
                    attributes: [],
                },
            },
            {
                model: ProductState,
                as: "entryState",
                attributes: ["id", "name"],
            },
            {
                model: ProductState,
                as: "outState",
                attributes: ["id", "name"],
            },
            {
                model: ProductState,
                as: "productStates",
                attributes: ["id", "name"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Business,
                attributes: ["name"],
            },
        ],
    },
}))
export default class Area extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column
    code!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        allowNull: false,
    })
    type!: area_types;

    @Column({
        allowNull: false,
        defaultValue: "BYORDERS",
    })
    productionMode!: production_mode;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isMainStock!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    saleByCategory!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    saleOnlyMyStock!: boolean;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    salaryPercent!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    salaryFixed!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    enforcedCommission!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    enablePercentAfter!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    enableSalaryByPercent!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    enforceCurrency!: boolean;

    @Column
    availableCodeCurrency!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    transferFoundsAfterClose!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    limitProductProduction!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    limitProductionToOrderProduction!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    productionOrderController!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    allowDirectlyMovements!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isPublicVisible!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    createAccessPointTicket!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    allowProductsMultiprice!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    allowManualPrice!: boolean;

    @Column
    defaultPaymentMethod!: string;

    @Column({
        allowNull: false,
        defaultValue: "PERSON",
    })
    accessMode!: access_mode;

    @Column
    defaultPaymentCurrency!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    giveChangeWith!: boolean;

    @Column({
        type: DataType.FLOAT,
    })
    fixedDiscount!: number;

    @Column({
        type: DataType.FLOAT,
    })
    fixedCommission!: number;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @BelongsToMany(() => User, {
        as: "stockAllowedUsers",
        through: { model: () => AllowedStockUserArea, unique: false },
    })
    stockAllowedUsers?: User[];

    @BelongsToMany(() => User, {
        as: "saleAllowedUsers",
        through: { model: () => AllowedSaleUserArea, unique: false },
    })
    saleAllowedUsers?: User[];

    @BelongsToMany(() => User, {
        as: "manufacturerAllowedUsers",
        through: { model: () => AllowedManufacturerUserArea, unique: false },
    })
    manufacturerAllowedUsers?: User[];

    @BelongsToMany(() => User, {
        as: "accessPointAllowedUsers",
        through: { model: () => AllowedAccessPointUserArea, unique: false },
    })
    accessPointAllowedUsers?: User[];

    @BelongsToMany(() => ProductState, {
        as: "productStates",
        through: { model: () => AreaProductState, unique: false },
    })
    productStates?: ProductState[];

    @HasMany(() => Resource)
    resources!: Resource[];

    @HasMany(() => Modifier)
    modifiers!: Modifier[];

    @HasMany(() => SelledProduct, "areaId")
    selledProducts!: SelledProduct[];

    @HasMany(() => FundDestination)
    fundDestinations!: FundDestination[];

    @HasMany(() => SelledProduct, "productionAreaId")
    productionSelledProducts!: SelledProduct[];

    @BelongsToMany(() => Product, {
        as: "productionProducts",
        through: { model: () => ProductionArea, unique: false },
    })
    productionProducts?: Product[];

    @HasMany(() => StockAreaProduct)
    stockAreaProducts!: StockAreaProduct[];

    @HasMany(() => BuyedReceipt)
    buyedReceipts!: BuyedReceipt[];

    @HasMany(() => ProductionOrder)
    productionOrders!: ProductionOrder[];

    @BelongsToMany(() => SalesCategory, {
        through: { model: () => CategorySalesPoint, unique: false },
    })
    salesCategories?: SalesCategory[];

    @HasMany(() => StockMovement, "areaId")
    stockMovements?: StockMovement[];

    @HasMany(() => SharedArea, "areaId")
    sharedAreas?: SharedArea[];

    @HasMany(() => StockMovement, "movedToId")
    stockMovementsTo?: StockMovement[];

    @HasMany(() => PersonAccessRecord)
    personAccess?: PersonAccessRecord[];

    @HasMany(() => Dispatch, "stockAreaFromId")
    dispatchsFrom?: Dispatch[];

    @HasMany(() => Dispatch, "stockAreaToId")
    dispatchsTo?: Dispatch[];

    @HasMany(() => OrderReceipt)
    ordersReceipt!: OrderReceipt[];

    @ForeignKey(() => Area)
    @Column
    stockAreaId!: number;

    @BelongsTo(() => Area, "stockAreaId")
    stockArea!: Area;

    @HasMany(() => Area, "stockAreaId")
    stockAreas?: Area[];

    @ForeignKey(() => Area)
    @Column
    initialStockId!: number;

    @BelongsTo(() => Area, "initialStockId")
    initialStock!: Area;

    @HasMany(() => Area, "initialStockId")
    initialStocks?: Area[];

    @ForeignKey(() => Area)
    @Column
    endStockId!: number;

    @BelongsTo(() => Area, "endStockId")
    endStock!: Area;

    @HasMany(() => Area, "endStockId")
    endStocks?: Area[];

    @HasMany(() => CashRegisterOperation)
    cashRegisterOperations?: CashRegisterOperation[];

    @HasMany(() => ProductionTicket)
    productionTickets!: ProductionTicket[];

    @ForeignKey(() => Account)
    @Column
    accountId!: number;

    @BelongsTo(() => Account)
    account!: Account;

    @ForeignKey(() => AccountTag)
    @Column
    accountTagId!: number;

    @BelongsTo(() => AccountTag)
    accountTag?: AccountTag;

    @BelongsToMany(() => Image, {
        through: { model: () => ImageArea, unique: false },
    })
    images?: Image[];

    @ForeignKey(() => ProductState)
    @Column
    entryStateId!: number;

    @BelongsTo(() => ProductState, "entryStateId")
    entryState!: ProductState;

    @ForeignKey(() => ProductState)
    @Column
    outStateId!: number;

    @BelongsTo(() => ProductState, "outStateId")
    outState!: ProductState;

    @BelongsToMany(() => Product, {
        as: "listManufacturations",
        through: { model: () => AreaProductManufacturation, unique: false },
    })
    listManufacturations?: Product[];

    @HasMany(() => AccessPointTicket)
    accessPointTickets?: AccessPointTicket[];

    @HasMany(() => Store)
    stores!: Store[];
}
