import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    DataType,
    Scopes,
} from "sequelize-typescript";
import User from "./user";
import BuyedReceipt from "./buyedReceipt";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "observations", "createdAt"],
    },
}))
export default class BuyedReceiptOperation extends Model {
    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    //Relations
    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User)
    madeBy!: User;

    @ForeignKey(() => BuyedReceipt)
    @Column
    buyedReceiptId!: number;

    @BelongsTo(() => BuyedReceipt)
    buyedReceipt!: BuyedReceipt;
}
