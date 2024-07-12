import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    IsEmail,
    HasMany,
    BelongsToMany,
    ForeignKey,
    BelongsTo,
    HasOne,
    Scopes,
} from "sequelize-typescript";
import {
    business_mode,
    business_status,
    business_types,
} from "../../interfaces/nomenclators";
import Account from "./account";
import Address from "./address";

import Area from "./area";
import AvailableCurrency from "./availableCurrency";
import BusinessCategory from "./businessCategory";
import CashRegisterOperation from "./cashRegisterOperation";
import Client from "./client";
import ConfigurationKey from "./configurationKey";
import EconomicCycle from "./economicCycle";
import Image from "./image";
import ImageBusiness from "./imageBusiness";
import OrderReceipt from "./orderReceipt";
import Person from "./person";
import Phone from "./phone";
import PhoneBusiness from "./phoneBusiness";
import Price from "./price";
import PriceSystem from "./priceSystem";
import Product from "./product";
import ProductCategory from "./productCategory";
import SalesCategory from "./salesCategory";
import ShippingRegion from "./shippingRegion";
import SocialNetwork from "./socialNetwork";
import StockMovement from "./stockMovement";
import SubscriptionPlan from "./subscriptionPlan";
import Supplier from "./supplier";
import User from "./user";
import Dispatch from "./dispatch";
import SharedArea from "./sharedArea";
import BusinessBranch from "./businessBranch";
import Shift from "./shift";
import ProductionOrder from "./productionOrder";
import ProductState from "./productState";
import AccessPointTicket from "./accessPointTicket";
import Municipality from "./municipality";
import Province from "./province";
import Coupon from "./coupon";
import Country from "./country";
import PaymentGateway from "./paymentGateway";
import Store from "./store";
import Recipe from "./recipe";
import Document from "./document";
import Batch from "./batch";
import PersonPost from "./personPost";
import PersonCategory from "./personCategory";
import SalaryRule from "./salaryRule";
import SalaryReport from "./salaryReport";
import Zone from "./zone";
import CustomerCategory from "./customerCategory";
import PrepaidPayment from "./prepaidPayment";
import FixedCostCategory from "./fixedCostCategory";
import BuyedReceipt from "./buyedReceipt";
import ReservationPolicy from "./reservationPolicy";
import Event from "./event";
import Tv from "./tv";

@Table
@Scopes(() => ({
    to_control: {
        attributes: [
            "id",
            "name",
            "status",
            "slug",
            "isActive",
            "dni",
            "licenceUntil",
            "type",
            "subscriptionPlanId",
            "indexSinTerceros",
            "enableManagementOrders",
        ],
        include: [
            {
                model: BusinessCategory,
                attributes: ["id", "name", "description"],
            },
            {
                model: Image,
                as: "logo",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: Image,
                as: "logoTicket",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: SubscriptionPlan,
                attributes: ["id", "name", "code", "description"],
                include: [
                    {
                        model: Price,
                        attributes: ["amount", "codeCurrency"],
                    },
                ],
            },
            {
                model: Price,
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: User,
                as: "masterOwner",
                attributes: ["id", "displayName", "username", "email"],
                paranoid: false,
            },
        ],
    },
    admin_details: {
        attributes: [
            "id",
            "name",
            "status",
            "promotionalText",
            "color",
            "description",
            "dni",
            "type",
            "email",
            "footerTicket",
            "openHours",
            "licenceUntil",
            "includeShop",
            "slug",
            "mode",
            "indexSinTerceros",
            "homeUrl",
            "enableManagementOrders",
        ],
        include: [
            { model: ConfigurationKey, attributes: ["key", "value"] },
            {
                model: BusinessCategory,
                attributes: ["id", "name", "description"],
            },
            {
                model: PriceSystem,
                attributes: ["id", "name", "isMain"],
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
                model: Image,
                as: "logo",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: Image,
                as: "logoTicket",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: Image,
                as: "banner",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: SubscriptionPlan,
                attributes: ["name", "code", "description"],
            },
            {
                model: SocialNetwork,
                attributes: ["user", "url", "type"],
            },
            {
                model: Address,
                attributes: [
                    "street_1",
                    "street_2",
                    "description",
                    "city",
                    "postalCode",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["id", "name", "code"],
                    },
                ],
            },
            {
                model: Phone,
                attributes: ["number", "description"],
                through: {
                    attributes: [],
                },
            },
        ],
    },
    details_control: {
        attributes: [
            "id",
            "name",
            "status",
            "slug",
            "isActive",
            "dni",
            "licenceUntil",
            "type",
            "subscriptionPlanId",
            "notificationServerKey",
            "woo_ck",
            "woo_sk",
            "woo_apiBase",
            "woo_apiVersion",
            "accessKey",
            "indexSinTerceros",
            "includeShop",
        ],
        include: [
            {
                model: ConfigurationKey,
                attributes: ["key", "value"],
                where: {
                    isSensitive: true,
                },
            },
            {
                model: BusinessCategory,
                attributes: ["id", "name", "description"],
            },
            {
                model: Image,
                as: "logo",
                attributes: ["src", "thumbnail", "blurHash"],
            },
            {
                model: SubscriptionPlan,
                attributes: ["name", "code", "description"],
                include: [
                    {
                        model: Price,
                        attributes: ["amount", "codeCurrency"],
                    },
                ],
            },
            {
                model: Address,
                attributes: [
                    "street_1",
                    "street_2",
                    "description",
                    "city",
                    "postalCode",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["id", "name", "code"],
                    },
                ],
            },
            {
                model: Phone,
                attributes: ["number", "description", "isMain"],
                through: {
                    attributes: [],
                },
            },
            {
                model: User,
                as: "masterOwner",
                attributes: ["displayName", "username", "email"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
                paranoid: false,
            },
            {
                model: Price,
                attributes: ["amount", "codeCurrency"],
            },
        ],
    },
    simple: {
        attributes: ["id", "name", "status", "slug", "dni"],
        include: [
            {
                model: BusinessCategory,
                attributes: ["id", "name", "description"],
            },
            {
                model: Image,
                as: "logo",
                attributes: ["src", "thumbnail", "blurHash"],
            },
            {
                model: Image,
                as: "logoTicket",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: Address,
                attributes: [
                    "street_1",
                    "street_2",
                    "description",
                    "city",
                    "postalCode",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["id", "name", "code"],
                    },
                ],
            },
            {
                model: Phone,
                attributes: ["number", "description", "isMain"],
                through: {
                    attributes: [],
                },
            },
            {
                model: User,
                as: "masterOwner",
                attributes: ["displayName", "username", "email"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
                paranoid: false,
            },
        ],
    },
}))
export default class Business extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        defaultValue: "CREATED",
    })
    status!: business_status;

    @Column({
        defaultValue: "SIMPLE",
    })
    mode!: business_mode;

    @Column
    promotionalText!: string;

    @Column
    color!: string;

    @Column
    notificationServerKey!: string;

    @Column
    openHours!: string;

    @Column({
        allowNull: false,
    })
    slug!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    enableManagementOrders!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    indexSinTerceros!: boolean;

    @Column({
        type: DataType.STRING,
        unique: true,
        allowNull: false,
    })
    dni!: string;

    @Column
    licenceUntil!: Date;

    @Column
    costCodeCurrency!: string;

    @Column
    featured!: boolean;

    @Column({
        allowNull: false,
        defaultValue: "RESTAURANT",
    })
    type!: business_types;

    @Column
    email!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    includeShop!: boolean;

    @Column
    homeUrl!: string;

    @Column({
        type: DataType.TEXT,
    })
    footerTicket!: string;

    //Woocommerce integration
    @Column
    woo_ck!: string;

    @Column
    woo_sk!: string;

    @Column
    woo_apiBase!: string;

    @Column
    woo_apiVersion!: string;

    @Column
    accessKey!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @HasMany(() => User, {
        onDelete: "CASCADE",
    })
    users!: User[];

    @HasMany(() => Area, {
        onDelete: "CASCADE",
    })
    areas!: Area[];

    @HasMany(() => Shift)
    shifts!: Shift[];

    @HasMany(() => EconomicCycle, {
        onDelete: "CASCADE",
    })
    economicCycles!: EconomicCycle[];

    @HasMany(() => Person, {
        onDelete: "CASCADE",
    })
    people!: Person[];

    @HasMany(() => PersonCategory, {
        onDelete: "CASCADE",
    })
    personCategories!: PersonCategory[];

    @HasMany(() => SocialNetwork, {
        onDelete: "CASCADE",
    })
    socialNetworks!: SocialNetwork[];

    @HasMany(() => Zone, {
        onDelete: "CASCADE",
    })
    zones!: Zone[];

    @HasMany(() => Product, {
        onDelete: "CASCADE",
    })
    products!: Product[];

    @HasMany(() => Supplier, {
        onDelete: "CASCADE",
    })
    suppliers!: Supplier[];

    @HasMany(() => Document, {
        onDelete: "CASCADE",
    })
    documents!: Document[];

    @HasMany(() => FixedCostCategory, {
        onDelete: "CASCADE",
    })
    fixedCostCategories!: FixedCostCategory[];

    @HasMany(() => BuyedReceipt, {
        onDelete: "CASCADE",
    })
    buyedReceipts!: BuyedReceipt[];

    @HasMany(() => SalaryRule, {
        onDelete: "CASCADE",
    })
    salaryRules!: SalaryRule[];

    @HasMany(() => SalaryReport, {
        onDelete: "CASCADE",
    })
    salaryReports!: SalaryReport[];

    @HasMany(() => Client, {
        onDelete: "CASCADE",
    })
    clients!: Client[];

    @HasMany(() => AccessPointTicket, {
        onDelete: "CASCADE",
    })
    accessPointTickets!: AccessPointTicket[];

    @ForeignKey(() => Address)
    @Column
    addressId!: number;

    @BelongsTo(() => Address)
    address?: Address;

    @HasMany(() => StockMovement, {
        onDelete: "CASCADE",
    })
    stockMovements!: StockMovement[];

    @HasMany(() => OrderReceipt, {
        onDelete: "CASCADE",
    })
    ordersReceipt!: OrderReceipt[];

    @HasMany(() => SalesCategory, {
        onDelete: "CASCADE",
    })
    salesCategories!: SalesCategory[];

    @HasMany(() => ProductCategory, {
        onDelete: "CASCADE",
    })
    productCategories!: ProductCategory[];

    @HasMany(() => ConfigurationKey, {
        onDelete: "CASCADE",
    })
    configurationsKey!: ConfigurationKey[];

    @BelongsToMany(() => Phone, () => PhoneBusiness)
    phones?: Phone[];

    @ForeignKey(() => SubscriptionPlan)
    @Column
    subscriptionPlanId!: number;

    @BelongsTo(() => SubscriptionPlan)
    subscriptionPlan!: SubscriptionPlan;

    @HasMany(() => Recipe, {
        onDelete: "CASCADE",
    })
    recipes!: Recipe[];

    @HasMany(() => AvailableCurrency, {
        onDelete: "CASCADE",
    })
    availableCurrencies!: AvailableCurrency[];

    @HasMany(() => PriceSystem, {
        onDelete: "CASCADE",
    })
    priceSystems!: PriceSystem[];

    @HasMany(() => Dispatch, {
        onDelete: "CASCADE",
    })
    dispatches!: Dispatch[];

    @HasMany(() => Coupon, {
        onDelete: "CASCADE",
    })
    coupons!: Coupon[];

    @HasMany(() => SharedArea)
    sharedAreas!: SharedArea[];

    @HasMany(() => ShippingRegion, {
        onDelete: "CASCADE",
    })
    shippingRegion!: ShippingRegion[];

    @HasMany(() => ProductionOrder, {
        onDelete: "CASCADE",
    })
    productionOrders!: ProductionOrder[];

    @HasMany(() => ProductState, {
        onDelete: "CASCADE",
    })
    productStates!: ProductState[];

    @HasMany(() => PersonPost, {
        onDelete: "CASCADE",
    })
    personPosts!: PersonPost[];

    @HasMany(() => Tv, {
        onDelete: "CASCADE",
    })
    tvs!: Tv[];

    @ForeignKey(() => BusinessCategory)
    @Column
    businessCategoryId!: number;

    @BelongsTo(() => BusinessCategory)
    businessCategory!: BusinessCategory;

    @HasMany(() => Account)
    accounts!: Account[];

    @HasMany(() => PaymentGateway)
    paymentsGateways!: PaymentGateway[];

    @HasMany(() => Batch)
    batches!: Batch[];

    @BelongsToMany(() => Image, {
        through: { model: () => ImageBusiness, unique: false },
    })
    images?: Image[];

    @ForeignKey(() => Image)
    @Column
    logoId!: number;

    @BelongsTo(() => Image, "logoId")
    logo!: Image;

    @ForeignKey(() => Image)
    @Column
    logoTicketId!: number;

    @BelongsTo(() => Image, "logoTicketId")
    logoTicket!: Image;

    @ForeignKey(() => Image)
    @Column
    bannerId!: number;

    @BelongsTo(() => Image, "bannerId")
    banner!: Image;

    @ForeignKey(() => Price)
    @Column
    subscriptionPlanPriceId!: number;

    @BelongsTo(() => Price)
    subscriptionPlanPrice!: Price;

    @ForeignKey(() => User)
    @Column
    masterOwnerId!: number;

    @BelongsTo(() => User, { constraints: false, foreignKey: "masterOwnerId" })
    masterOwner!: User;

    @BelongsToMany(() => Business, {
        through: { model: () => BusinessBranch, unique: false },
        foreignKey: "branchId",
    })
    baseBusinesses?: Business[];

    @BelongsToMany(() => Business, {
        through: { model: () => BusinessBranch, unique: false },
        foreignKey: "businessBaseId",
    })
    branches?: Business[];

    @HasMany(() => Store)
    stores!: Store[];

    @HasMany(() => CustomerCategory)
    customerCategories!: CustomerCategory[];

    @HasMany(() => PrepaidPayment)
    prepaidPayments!: PrepaidPayment[];

    @HasMany(() => ReservationPolicy)
    reservationPolicy!: ReservationPolicy[];

    @HasMany(() => Event)
    events!: Event[];
}
