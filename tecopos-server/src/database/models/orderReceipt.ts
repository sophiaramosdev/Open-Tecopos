import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    HasMany,
    HasOne,
    Scopes,
    BelongsToMany,
} from "sequelize-typescript";

import Area from "./area";
import Business from "./business";
import CurrencyPayment from "./currencyPayment";
import EconomicCycle from "./economicCycle";
import SelledProduct from "./selledProduct";
import User from "./user";
import ProductionTicket from "./productionTicket";
import OrderReceiptPrice from "./orderReceiptPrice";
import Client from "./client";
import Price from "./price";
import {
    order_origin,
    order_receipt_status,
} from "../../interfaces/nomenclators";
import CashRegisterOperation from "./cashRegisterOperation";
import OrderReceiptRecord from "./orderReceiptRecord";
import SelledProductAddon from "./selledProductAddon";
import Image from "./image";
import Address from "./address";
import Phone from "./phone";
import Dispatch from "./dispatch";
import AccessPointTicket from "./accessPointTicket";
import Resource from "./resource";
import OrderResource from "./orderResource";
import BillingAddress from "./billingAddress";
import ShippingAddress from "./shippingAddress";
import Municipality from "./municipality";
import Province from "./province";
import Country from "./country";
import PaymentGateway from "./paymentGateway";
import Coupon from "./coupon";
import OrderReceiptCoupon from "./orderReceiptCoupon";
import OrderReceiptTotal from "./OrderReceiptTotal";
import Variation from "./variation";
import ShippingRegion from "./shippingRegion";
import PartialPayment from "./partialPayment";
import PrepaidPayment from "./prepaidPayment";
import OrderReceiptModifier from "./orderReceiptModifier";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "status",
            "discount",
            "commission",
            "observations",
            "numberClients",
            "closedDate",
            "isForTakeAway",
            "createdAt",
            "updatedAt",
            "businessId",
            "operationNumber",
            "preOperationNumber",
            "reservationNumber",
            "houseCosted",
            "totalCost",
            "origin",
            "modifiedPrice",
            "customerNote",
            "paidAt",
            "pickUpInStore",
            "deliveryAt",
            "externalId",
            "registeredAt",
            "paymentDeadlineAt",
            "isPreReceipt",
            "meta",
            "isReservation",
        ],
        include: [
            {
                model: SelledProduct,
                attributes: [
                    "id",
                    "name",
                    "quantity",
                    "status",
                    "observations",
                    "type",
                    "areaId",
                    "productionAreaId",
                    "productionTicketId",
                    "productId",
                    "variationId",
                    "createdAt",
                    "updatedAt",
                    "totalCost",
                    "modifiedPrice",
                    "measure",
                    "startDateAt",
                    "endDateAt",
                    "numberAdults",
                    "numberKids",
                    "colorCategory",
                ],
                separate: true,
                required: false,
                include: [
                    {
                        model: SelledProductAddon,
                        attributes: ["id", "quantity", "name", "productId"],
                        include: [
                            {
                                model: Price,
                                attributes: ["amount", "codeCurrency"],
                            },
                        ],
                    },
                    {
                        model: Image,
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                    {
                        model: Price,
                        as: "priceTotal",
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: Price,
                        as: "baseUnitaryPrice",
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: Price,
                        as: "priceUnitary",
                        attributes: ["amount", "codeCurrency"],
                    },
                    { model: Variation, attributes: ["id", "name"] },
                ],
            },
            {
                model: CurrencyPayment,
                attributes: ["amount", "codeCurrency", "paymentWay"],
                separate: true,
            },
            {
                model: OrderReceiptPrice,
                attributes: ["price", "codeCurrency"],
            },
            {
                model: OrderReceiptTotal,
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: User,
                as: "salesBy",
                attributes: ["id", "username", "displayName"],
                paranoid: false,
            },
            {
                model: User,
                as: "managedBy",
                attributes: ["id", "username", "displayName"],
                paranoid: false,
            },
            {
                model: Area,
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: Client,
                attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "observations",
                    "email",
                    "ci",
                    "legalNotes",
                ],
                include: [
                    {
                        model: Address,
                        attributes: [
                            "id",
                            "street_1",
                            "street_2",
                            "description",
                            "city",
                            "postalCode",
                        ],
                    },
                    {
                        model: Phone,
                        through: { attributes: [] },
                        attributes: ["id", "number", "description"],
                    },
                ],
                paranoid: false,
            },
            {
                model: BillingAddress,
                attributes: [
                    "street_1",
                    "street_2",
                    "firstName",
                    "lastName",
                    "company",
                    "city",
                    "postalCode",
                    "phone",
                    "email",
                    "description",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["name", "code"],
                    },
                ],
            },
            {
                model: ShippingAddress,
                attributes: [
                    "street_1",
                    "street_2",
                    "firstName",
                    "lastName",
                    "company",
                    "city",
                    "postalCode",
                    "phone",
                    "email",
                    "description",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["name", "code"],
                    },
                ],
            },
            {
                model: Price,
                as: "shippingPrice",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "taxes",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "tipPrice",
                attributes: ["amount", "codeCurrency", "paymentWay"],
            },
            {
                model: Price,
                as: "amountReturned",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "couponDiscountPrice",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: User,
                as: "shippingBy",
                attributes: ["id", "username", "displayName"],
                paranoid: false,
            },
            {
                model: Dispatch,
                attributes: ["id", "observations", "status", "createdAt"],
            },
            {
                model: PaymentGateway,
                attributes: [
                    "id",
                    "externalId",
                    "isActive",
                    "name",
                    "code",
                    "description",
                    "paymentWay",
                ],
            },
            {
                model: Resource,
                as: "listResources",
                attributes: ["id", "code"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                paranoid: false,
            },
        ],
    },
    public_return: {
        attributes: [
            "id",
            "status",
            "discount",
            "commission",
            "observations",
            "createdAt",
            "operationNumber",
            "preOperationNumber",
            "origin",
            "customerNote",
            "paidAt",
            "clientId",
            "pickUpInStore",
            "deliveryAt",
            "registeredAt",
            "paymentDeadlineAt",
            "isPreReceipt",
            "isReservation",
            "meta",
        ],
        include: [
            {
                model: SelledProduct,
                attributes: [
                    "id",
                    "name",
                    "quantity",
                    "status",
                    "observations",
                    "type",
                    "productId",
                    "variationId",
                    "createdAt",
                    "measure",
                ],
                required: false,
                separate: true,
                include: [
                    {
                        model: SelledProductAddon,
                        attributes: ["id", "quantity", "name", "productId"],
                        include: [
                            {
                                model: Price,
                                attributes: ["amount", "codeCurrency"],
                            },
                        ],
                    },
                    {
                        model: Image,
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                    {
                        model: Price,
                        as: "priceTotal",
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: Price,
                        as: "priceUnitary",
                        attributes: ["amount", "codeCurrency"],
                    },
                    { model: Variation, attributes: ["id", "name"] },
                ],
            },
            {
                model: CurrencyPayment,
                attributes: ["amount", "codeCurrency", "paymentWay"],
            },
            {
                model: OrderReceiptPrice,
                attributes: ["price", "codeCurrency"],
            },
            {
                model: OrderReceiptTotal,
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: BillingAddress,
                attributes: [
                    "street_1",
                    "street_2",
                    "firstName",
                    "lastName",
                    "company",
                    "city",
                    "postalCode",
                    "phone",
                    "email",
                    "description",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["name", "code"],
                    },
                ],
            },
            {
                model: ShippingAddress,
                attributes: [
                    "street_1",
                    "street_2",
                    "firstName",
                    "lastName",
                    "company",
                    "city",
                    "postalCode",
                    "phone",
                    "email",
                    "description",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["name", "code"],
                    },
                ],
            },
            {
                model: Price,
                as: "shippingPrice",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "taxes",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "couponDiscountPrice",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                paranoid: false,
            },
            {
                model: Client,
                attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "observations",
                    "email",
                    "legalNotes",
                ],
                include: [
                    {
                        model: Address,
                        attributes: [
                            "id",
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
                            {
                                model: ShippingRegion,
                                attributes: ["id", "name"],
                                paranoid: false,
                            },
                        ],
                    },
                    {
                        model: Phone,
                        through: { attributes: [] },
                        attributes: ["id", "number", "description"],
                    },
                ],
                paranoid: false,
            },
            {
                model: PaymentGateway,
                attributes: ["id", "code", "name", "paymentWay"],
            },
            PartialPayment,
        ],
    },
    full_details: {
        attributes: [
            "id",
            "name",
            "status",
            "discount",
            "commission",
            "observations",
            "numberClients",
            "closedDate",
            "isForTakeAway",
            "createdAt",
            "updatedAt",
            "businessId",
            "operationNumber",
            "preOperationNumber",
            "reservationNumber",
            "houseCosted",
            "totalCost",
            "origin",
            "modifiedPrice",
            "customerNote",
            "paidAt",
            "pickUpInStore",
            "deliveryAt",
            "externalId",
            "registeredAt",
            "paymentDeadlineAt",
            "isPreReceipt",
            "isReservation",
            "meta",
        ],
        include: [
            {
                model: SelledProduct,
                attributes: [
                    "id",
                    "name",
                    "quantity",
                    "status",
                    "observations",
                    "type",
                    "areaId",
                    "productionAreaId",
                    "productionTicketId",
                    "productId",
                    "variationId",
                    "createdAt",
                    "updatedAt",
                    "totalCost",
                    "modifiedPrice",
                    "measure",
                ],
                required: false,
                separate: true,
                include: [
                    {
                        model: SelledProductAddon,
                        attributes: ["id", "quantity", "name", "productId"],
                        include: [
                            {
                                model: Price,
                                attributes: ["amount", "codeCurrency"],
                            },
                        ],
                    },
                    {
                        model: Image,
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                    {
                        model: Price,
                        as: "priceTotal",
                        attributes: ["amount", "codeCurrency"],
                    },
                    {
                        model: Price,
                        as: "priceUnitary",
                        attributes: ["amount", "codeCurrency"],
                    },
                    { model: Variation, attributes: ["id", "name"] },
                ],
            },
            {
                model: CurrencyPayment,
                attributes: ["id", "amount", "codeCurrency", "paymentWay"],
            },
            {
                model: EconomicCycle,
                attributes: ["id", "openDate"],
                paranoid: false,
            },
            {
                model: BillingAddress,
                attributes: [
                    "street_1",
                    "street_2",
                    "firstName",
                    "lastName",
                    "company",
                    "city",
                    "postalCode",
                    "phone",
                    "email",
                    "description",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["name", "code"],
                    },
                ],
            },
            {
                model: ShippingAddress,
                attributes: [
                    "street_1",
                    "street_2",
                    "firstName",
                    "lastName",
                    "company",
                    "city",
                    "postalCode",
                    "phone",
                    "email",
                    "description",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["name", "code"],
                    },
                ],
            },
            {
                model: OrderReceiptPrice,
                attributes: ["price", "codeCurrency"],
            },
            {
                model: OrderReceiptTotal,
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: User,
                as: "salesBy",
                attributes: ["id", "username", "displayName"],
                paranoid: false,
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
            },
            {
                model: User,
                as: "managedBy",
                attributes: ["id", "username", "displayName"],
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
                model: Area,
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: Client,
                attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "observations",
                    "email",
                    "ci",
                    "legalNotes",
                    "codeClient",
                    "contractNumber",
                    "createdAt",
                ],
                include: [
                    {
                        model: Address,
                        attributes: [
                            "id",
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
                            {
                                model: ShippingRegion,
                                attributes: ["id", "name"],
                                paranoid: false,
                            },
                        ],
                    },
                    {
                        model: Phone,
                        through: { attributes: [] },
                        attributes: ["id", "number", "description"],
                    },
                ],
                paranoid: false,
            },
            {
                model: Price,
                as: "shippingPrice",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "taxes",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "tipPrice",
                attributes: ["amount", "codeCurrency", "paymentWay"],
            },
            {
                model: Price,
                as: "amountReturned",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Price,
                as: "couponDiscountPrice",
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: User,
                as: "shippingBy",
                attributes: ["id", "username", "displayName"],
                paranoid: false,
            },
            {
                model: Dispatch,
                attributes: ["id", "observations", "status", "createdAt"],
            },
            {
                model: CashRegisterOperation,
                attributes: [
                    "amount",
                    "codeCurrency",
                    "observations",
                    "operationNumber",
                    "operation",
                    "createdAt",
                ],
            },
            {
                model: PaymentGateway,
                attributes: [
                    "id",
                    "externalId",
                    "isActive",
                    "code",
                    "name",
                    "description",
                    "paymentWay",
                ],
            },
            {
                model: Resource,
                as: "listResources",
                attributes: ["id", "code"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                paranoid: false,
            },
            {
                model: OrderReceiptRecord,
                as: "records",
                attributes: [
                    "action",
                    "title",
                    "details",
                    "observations",
                    "createdAt",
                ],
                include: [
                    {
                        model: User,
                        as: "madeBy",
                        attributes: ["id", "username", "displayName"],
                        paranoid: false,
                        include: [
                            {
                                model: Image,
                                as: "avatar",
                                attributes: [
                                    "id",
                                    "src",
                                    "thumbnail",
                                    "blurHash",
                                ],
                            },
                        ],
                    },
                ],
                order: ["createdAt", "ASC"],
            },
            {
                model: ProductionTicket,
                attributes: [
                    "id",
                    "name",
                    "status",
                    "productionNumber",
                    "createdAt",
                ],
                separate: true,
                include: [
                    {
                        model: User,
                        attributes: ["id", "username", "displayName"],
                        paranoid: false,
                        include: [
                            {
                                model: Image,
                                as: "avatar",
                                attributes: [
                                    "id",
                                    "src",
                                    "thumbnail",
                                    "blurHash",
                                ],
                            },
                        ],
                    },
                    {
                        model: Area,
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                    {
                        model: SelledProduct,
                        as: "selledProducts",
                        attributes: ["name", "quantity", "status"],
                    },
                ],
            },
            {
                model: PartialPayment,
                include: [
                    {
                        model: CashRegisterOperation,
                        include: [
                            {
                                model: User,
                                attributes: [
                                    "id",
                                    "username",
                                    "displayName",
                                    "email",
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                model: OrderReceiptModifier,
                attributes: [
                    "showName",
                    "amount",
                    "codeCurrency",
                    "modifierId",
                ],
            },
        ],
    },
}))
export default class OrderReceipt extends Model {
    @Column
    externalId!: string;

    @Column
    name!: string;

    @Column
    previousName!: string;

    @Column
    status!: order_receipt_status;

    @Column
    origin!: order_origin;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    discount!: number;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    commission!: number;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 1,
    })
    operationNumber!: number;

    @Column({
        type: DataType.INTEGER,
    })
    preOperationNumber!: number;

    @Column({
        type: DataType.INTEGER,
    })
    reservationNumber!: number;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.TEXT,
    })
    customerNote!: string;

    @Column({
        type: DataType.INTEGER,
    })
    numberClients!: number;

    @Column({
        type: DataType.TEXT,
    })
    meta!: string;

    @Column({
        type: DataType.DATE,
    })
    closedDate!: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    paidAt!: Date;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isForTakeAway!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    createdInActualCycle!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    pickUpInStore!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    houseCosted!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    modifiedPrice!: boolean;

    @Column
    isReservation!: boolean;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    totalCost!: number;

    @Column
    deliveryAt!: Date;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isPreReceipt!: boolean;

    //new Model
    @Column({
        type: DataType.DATE,
    })
    paymentDeadlineAt!: Date;

    //timestamps
    //   @DeletedAt
    //   deletedAt!: Date;

    //new Model
    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    registeredAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @HasMany(() => SelledProduct)
    selledProducts!: SelledProduct[];

    @ForeignKey(() => User)
    @Column
    managedById!: number;

    @BelongsTo(() => User, "managedById")
    managedBy?: User;

    @ForeignKey(() => User)
    @Column
    salesById!: number;

    @BelongsTo(() => User, "salesById")
    salesBy?: User;

    @ForeignKey(() => EconomicCycle)
    @Column({
        onDelete: "CASCADE",
    })
    economicCycleId!: number;

    @BelongsTo(() => EconomicCycle)
    economicCycle!: EconomicCycle;

    @ForeignKey(() => Client)
    @Column
    clientId!: number;

    @BelongsTo(() => Client)
    client?: Client;

    @ForeignKey(() => Area)
    @Column
    areaSalesId!: number;

    @BelongsTo(() => Area)
    areaSales?: Area;

    @ForeignKey(() => PaymentGateway)
    @Column
    paymentGatewayId!: number;

    @BelongsTo(() => PaymentGateway)
    paymentGateway?: PaymentGateway;

    @HasMany(() => CurrencyPayment)
    currenciesPayment!: CurrencyPayment[];

    @HasMany(() => ProductionTicket)
    tickets!: ProductionTicket[];

    @HasMany(() => OrderReceiptRecord)
    records!: OrderReceiptRecord[];

    @HasMany(() => OrderReceiptPrice)
    prices!: OrderReceiptPrice[];

    @HasMany(() => OrderReceiptModifier)
    orderModifiers!: OrderReceiptModifier[];

    @HasMany(() => OrderReceiptTotal)
    totalToPay!: OrderReceiptTotal[];

    @ForeignKey(() => User)
    @Column
    shippingById!: number;

    @BelongsTo(() => User, "shippingById")
    shippingBy?: User;

    @ForeignKey(() => Price)
    @Column
    shippingPriceId!: number;

    @BelongsTo(() => Price, "shippingPriceId")
    shippingPrice?: Price;

    @ForeignKey(() => Price)
    @Column
    tipPriceId!: number;

    @BelongsTo(() => Price, "tipPriceId")
    tipPrice?: Price;

    @ForeignKey(() => Price)
    @Column
    taxesId!: number;

    @BelongsTo(() => Price, "taxesId")
    taxes?: Price;

    @ForeignKey(() => Price)
    @Column
    couponDiscountPriceId!: number;

    @BelongsTo(() => Price, "couponDiscountPriceId")
    couponDiscountPrice?: Price;

    @ForeignKey(() => Price)
    @Column
    amountReturnedId!: number;

    @BelongsTo(() => Price, "amountReturnedId")
    amountReturned?: Price;

    @HasMany(() => CashRegisterOperation)
    cashRegisterOperations!: CashRegisterOperation[];

    @ForeignKey(() => Dispatch)
    @Column
    dispatchId!: number;

    @BelongsTo(() => Dispatch)
    dispatch!: Dispatch;

    @ForeignKey(() => AccessPointTicket)
    @Column
    accessPointTicketId!: number;

    @BelongsTo(() => AccessPointTicket)
    accessPointTicket!: AccessPointTicket;

    @BelongsToMany(() => Resource, {
        through: { model: () => OrderResource, unique: false },
    })
    listResources?: Resource[];

    @HasOne(() => BillingAddress)
    billing!: BillingAddress;

    @HasOne(() => ShippingAddress)
    shipping!: ShippingAddress;

    @BelongsToMany(() => Coupon, {
        through: { model: () => OrderReceiptCoupon, unique: false },
    })
    coupons?: Coupon[];

    //new Model
    @HasMany(() => PartialPayment)
    partialPayments!: PartialPayment[];

    @HasMany(() => PrepaidPayment)
    prepaidPayment!: PrepaidPayment[];
}
