import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
} from "sequelize-typescript";
import {
    productType,
    selled_products_status,
} from "../../interfaces/nomenclators";
import Area from "./area";
import EconomicCycle from "./economicCycle";
import Image from "./image";
import OrderReceipt from "./orderReceipt";
import Price from "./price";
import Product from "./product";
import ProductionTicket from "./productionTicket";
import SelledProductAddon from "./selledProductAddon";
import Variation from "./variation";
import Supplier from "./supplier";
import Resource from "./resource";
import ReservationRecord from "./reservationRecord";

@Table
export default class SelledProduct extends Model {
    @Column
    name!: string;

    @Column
    measure!: string;

    @Column({
        type: DataType.DOUBLE,
    })
    quantity!: number;

    @Column
    status!: selled_products_status;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        defaultValue: "STOCK",
    })
    type!: productType;

    @Column({
        type: DataType.FLOAT,
    })
    totalCost!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    modifiedPrice!: boolean;

    @Column
    colorCategory!: string;

    @Column
    isReservation!: boolean;

    @Column
    numberReservation!: number;

    @Column(DataType.DATE)
    startDateAt!: Date;

    @Column(DataType.DATE)
    endDateAt!: Date;

    @Column(DataType.INTEGER)
    numberAdults!: number;

    @Column(DataType.INTEGER)
    numberKids!: number;

    //Relations
    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area, "areaId")
    area!: Area;

    @ForeignKey(() => Area)
    @Column
    productionAreaId!: number;

    @BelongsTo(() => Area, "productionAreaId")
    productionArea!: Area;

    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;

    @ForeignKey(() => Supplier)
    @Column
    supplierId!: number;

    @BelongsTo(() => Supplier)
    supplier!: Supplier;

    @HasMany(() => SelledProductAddon)
    addons?: SelledProductAddon[];

    @ForeignKey(() => ProductionTicket)
    @Column
    productionTicketId!: number;

    @BelongsTo(() => ProductionTicket)
    productionTicket!: ProductionTicket;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product, "productId")
    product!: Product;

    @ForeignKey(() => Resource)
    @Column
    resourceId!: number;

    @BelongsTo(() => Resource, "resourceId")
    resource!: Resource;

    @ForeignKey(() => EconomicCycle)
    @Column
    economicCycleId!: number;

    @BelongsTo(() => EconomicCycle)
    economicCycle!: EconomicCycle;

    @ForeignKey(() => Image)
    @Column
    imageId!: number;

    @BelongsTo(() => Image)
    image!: Image;

    @ForeignKey(() => Variation)
    @Column
    variationId!: number;

    @BelongsTo(() => Variation)
    variation!: Variation;

    @ForeignKey(() => Price)
    @Column
    priceTotalId!: number;

    @BelongsTo(() => Price, "priceTotalId")
    priceTotal!: Price;

    @ForeignKey(() => Price)
    @Column
    priceUnitaryId!: number;

    @BelongsTo(() => Price, "priceUnitaryId")
    priceUnitary!: Price;

    @ForeignKey(() => Price)
    @Column
    baseUnitaryPriceId!: number;

    @BelongsTo(() => Price, "baseUnitaryPriceId")
    baseUnitaryPrice!: Price;

    @HasMany(() => ReservationRecord)
    records!: ReservationRecord[];
}
