import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";
import {
    accountOperationType,
    cash_registers_operations,
} from "../../interfaces/nomenclators";
import Area from "./area";
import EconomicCycle from "./economicCycle";
import OrderReceipt from "./orderReceipt";
import User from "./user";
import Image from "./image";
import PrepaidPayment from "./prepaidPayment";
import PartialPayment from "./partialPayment";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "amount",
            "codeCurrency",
            "observations",
            "operation",
            "createdAt",
            "operationNumber",
        ],
        include: [
            {
                model: User,
                as: "madeBy",
                attributes: ["id", "username", "displayName"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
            },
        ],
    },
}))
export default class CashRegisterOperation extends Model {
    @Column({
        type: DataType.FLOAT,
        allowNull: false,
    })
    amount!: number;

    @Column
    codeCurrency!: string;

    @Column
    observations!: string;

    @Column({
        type: DataType.INTEGER,
    })
    operationNumber!: number;

    @Column
    operation!: cash_registers_operations;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    includeAsAccountOperation!: boolean;

    @Column
    type!: accountOperationType;

    //Relations
    @ForeignKey(() => EconomicCycle)
    @Column
    economicCycleId!: number;

    @BelongsTo(() => EconomicCycle)
    economicCycle!: EconomicCycle;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;

    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User, { foreignKey: "madeById", constraints: false })
    madeBy!: User;

    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;

    @ForeignKey(() => PrepaidPayment)
    @Column
    prepaidPaymentId!: number;

    @BelongsTo(() => PrepaidPayment)
    prepaidPayment!: PrepaidPayment;

    @ForeignKey(() => PartialPayment)
    @Column
    partialPaymentId!: number;
}
