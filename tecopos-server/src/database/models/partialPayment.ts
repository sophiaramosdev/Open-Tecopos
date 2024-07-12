import {
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    DeletedAt,
    ForeignKey,
    HasMany,
    Model,
    Table,
    UpdatedAt,
} from "sequelize-typescript";
import OrderReceipt from "./orderReceipt";
import { payments_ways } from "../../interfaces/nomenclators";
import CashRegisterOperation from "./cashRegisterOperation";
import EconomicCycle from "./economicCycle";

@Table
export default class PartialPayment extends Model {
    @Column
    paymentNumber!: number;

    @Column({
        allowNull: false,
        type: DataType.FLOAT,
    })
    amount!: number;

    @Column
    codeCurrency!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column
    paymentWay!: payments_ways;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    //Relations
    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;

    @ForeignKey(() => EconomicCycle)
    @Column
    economicCycleId!: number;

    @BelongsTo(() => EconomicCycle)
    economicCycle!: EconomicCycle;

    //cash
    @HasMany(() => CashRegisterOperation)
    cashRegisterOperations!: CashRegisterOperation[];
}
