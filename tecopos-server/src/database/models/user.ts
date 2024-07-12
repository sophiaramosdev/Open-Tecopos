import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    BelongsToMany,
    IsEmail,
    ForeignKey,
    BelongsTo,
    HasMany,
    HasOne,
    Scopes,
} from "sequelize-typescript";
import Area from "./area";

import Business from "./business";
import EconomicCycle from "./economicCycle";
import OrderReceipt from "./orderReceipt";
import Role from "./role";
import UserRole from "./userRole";
import StockMovement from "./stockMovement";
import Person from "./person";
import StockAreaBook from "./stockAreaBook";
import ProductionTicket from "./productionTicket";
import AllowedSaleUserArea from "./allowedSaleUserArea";
import AllowedManufacturerUserArea from "./allowedManufacturerUserArea";
import AllowedStockUserArea from "./allowedStockUserArea";
import CashRegisterOperation from "./cashRegisterOperation";
import Account from "./account";
import AllowedAccountUser from "./allowedAccountUser";
import AccountOperation from "./accountOperation";
import Image from "./image";
import Billing from "./billing";
import OrderReceiptRecord from "./orderReceiptRecord";
import Dispatch from "./dispatch";
import SharedArea from "./sharedArea";
import Shift from "./shift";
import ProductionOrder from "./productionOrder";
import MovementStateRecord from "./movementStateRecord";
import AccessPointTicket from "./accessPointTicket";
import AllowedAccessPointUserArea from "./allowedAccessPointUserArea";
import ListUserAddress from "./listUserAddress";
import Address from "./address";
import Client from "./client";
import Store from "./store";
import Municipality from "./municipality";
import Province from "./province";
import Country from "./country";
import Phone from "./phone";
import PersonRecord from "./personRecord";
import SalaryReport from "./salaryReport";
import PersonAccessRecord from "./personAccessRecord";
import Document from "./document";
import AccountList from "./accountList";
import Tv from "./tv";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "username",
            "email",
            "displayName",
            "lastLogin",
            "isActive",
            "businessId",
            "isSuperAdmin",
        ],
        include: [
            {
                model: Role,
                as: "roles",
                attributes: ["code", "name"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Business,
                as: "business",
                attributes: ["id", "name"],
            },
            {
                model: Area,
                as: "allowedStockAreas",
                attributes: ["id", "name", "businessId"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Area,
                as: "allowedSalesAreas",
                attributes: ["id", "name", "businessId"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Area,
                as: "allowedManufacturerAreas",
                attributes: ["id", "name", "businessId"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Area,
                as: "allowedAccessPointAreas",
                attributes: ["id", "name", "businessId"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Image,
                as: "avatar",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
        ],
    },
    public_return: {
        attributes: ["id", "username", "email", "displayName"],
        include: [
            {
                model: Image,
                as: "avatar",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: Business,
                as: "business",
                attributes: ["id", "name"],
            },
            {
                model: Client,
                attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "sex",
                    "birthAt",
                    "email",
                ],
                include: [
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
        ],
    },
    simple_user: {
        attributes: ["id", "username", "email", "displayName"],
        paranoid: false,
        include: [
            {
                model: Image,
                as: "avatar",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
        ],
    },
}))
export default class User extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    username!: string;

    @IsEmail
    @Column
    email!: string;

    @Column
    password!: string;

    @Column
    notificationToken!: string;

    @Column
    pinPassword!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isSuperAdmin!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isLogued!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isEmailConfirmed!: boolean;

    @Column
    lastLogin!: Date;

    @Column
    displayName!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @BelongsToMany(() => Role, {
        through: { model: () => UserRole, unique: false },
    })
    roles?: Role[];

    @BelongsToMany(() => Area, {
        through: { model: () => AllowedStockUserArea, unique: false },
    })
    allowedStockAreas?: Area[];

    @BelongsToMany(() => Area, {
        through: { model: () => AllowedAccessPointUserArea, unique: false },
    })
    allowedAccessPointAreas?: Area[];

    @BelongsToMany(() => Area, {
        through: { model: () => AllowedSaleUserArea, unique: false },
    })
    allowedSalesAreas?: Area[];

    @BelongsToMany(() => Address, {
        through: { model: () => ListUserAddress, unique: false },
    })
    addresses?: Address[];

    @BelongsToMany(() => Area, {
        through: { model: () => AllowedManufacturerUserArea, unique: false },
    })
    allowedManufacturerAreas?: Area[];

    @BelongsToMany(() => Account, {
        through: { model: () => AllowedAccountUser, unique: false },
    })
    allowedAccountUsers?: Account[];

    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @HasMany(() => EconomicCycle, "openById")
    economicCycleOpeners!: EconomicCycle[];

    @HasMany(() => EconomicCycle, "closedById")
    economicCycleCloseners!: EconomicCycle[];

    @HasMany(() => Shift, "openById")
    shiftOpeners!: Shift[];

    @HasMany(() => Shift, "closedById")
    shiftCloseners!: Shift[];

    @HasMany(() => OrderReceipt, "managedById")
    orderManagers!: OrderReceipt[];

    @HasMany(() => OrderReceipt, "salesById")
    orderSalers!: OrderReceipt[];

    @HasMany(() => OrderReceipt, "shippingById")
    shippingByers!: OrderReceipt[];

    @HasMany(() => AccessPointTicket, "madeById")
    accessPointMaders!: AccessPointTicket[];

    @HasMany(() => AccessPointTicket, "managedById")
    accessPointManagers!: AccessPointTicket[];

    @HasMany(() => ProductionOrder)
    productionOrderCreators!: ProductionOrder[];

    @HasMany(() => AccountList)
    accountLists!: AccountList[];

    @HasMany(() => MovementStateRecord)
    stockMovementStateRecords!: MovementStateRecord[];

    @HasMany(() => StockAreaBook, "madeById")
    stockMaders!: StockAreaBook[];

    @HasMany(() => Store)
    users!: Store[];

    @HasMany(() => PersonRecord)
    personRecords!: PersonRecord[];

    @HasMany(() => OrderReceiptRecord, "madeById")
    ordersMaders!: OrderReceiptRecord[];

    @HasMany(() => Tv, "madeById")
    tvMaders!: Tv[];

    @HasMany(() => StockMovement, "movedById")
    stockMovers!: StockMovement[];

    @HasMany(() => StockMovement, "approvedById")
    stockApprovers!: StockMovement[];

    @HasMany(() => Billing, "registeredById")
    registeres!: Billing[];

    @HasMany(() => Dispatch, "createdById")
    dispatchCreators!: Dispatch[];

    @HasMany(() => Dispatch, "receivedById")
    dispatchReceivers!: Dispatch[];

    @HasMany(() => Dispatch, "rejectedById")
    dispatchRejecters!: Dispatch[];

    @HasMany(() => SharedArea, "sharedById")
    sharersArea!: SharedArea[];

    @HasMany(() => ProductionTicket, "preparedById")
    preparers!: ProductionTicket[];

    @HasMany(() => Account, { constraints: false, foreignKey: "ownerId" })
    accountOwners!: Account[];

    @HasMany(() => Account, { constraints: false, foreignKey: "createdById" })
    accountCreators!: Account[];

    @HasMany(() => AccountOperation, "madeById")
    accountMaders!: AccountOperation[];

    @HasMany(() => Document, "uploadedById")
    docUploaders!: Document[];

    @HasMany(() => PersonAccessRecord)
    accessRecorders!: PersonAccessRecord[];

    @HasMany(() => CashRegisterOperation)
    cashOperationMaders!: CashRegisterOperation[];

    @HasMany(() => Client)
    clients!: Client[];

    @HasOne(() => Person)
    person!: Person;

    @HasOne(() => SalaryReport)
    salaryGenerator!: SalaryReport;

    @ForeignKey(() => Image)
    @Column
    avatarId!: number;

    @BelongsTo(() => Image)
    avatar!: Image;

    @HasMany(() => Business, {
        constraints: false,
        foreignKey: "masterOwnerId",
    })
    masterOwners!: Business[];
}
