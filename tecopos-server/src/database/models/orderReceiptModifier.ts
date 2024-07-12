import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";
import Area from "./area";
import OrderReceipt from "./orderReceipt";
import Price from "./price";
import Modifier from "./modifier";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["showName", "amount", "codeCurrency", "modifierId"],
        include: [
            {
                model: Area,
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: Price,
            },
        ],
    },
}))
export default class OrderReceiptModifier extends Model {
    @Column
    showName!: string;

    @Column({
        allowNull: false,
        type: DataType.FLOAT,
    })
    amount!: number;

    @Column
    codeCurrency!: string;

    //Relations
    @ForeignKey(() => Modifier)
    @Column
    modifierId!: number;

    @BelongsTo(() => Modifier)
    modifier!: Modifier;

    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;
}
