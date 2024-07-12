import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    DataType,
    CreatedAt,
    UpdatedAt,
} from "sequelize-typescript";
import {
    order_receipt_status,
    reservation_actions,
} from "../../interfaces/nomenclators";
import User from "./user";
import SelledProduct from "./selledProduct";

@Table
export default class ReservationRecord extends Model {
    @Column
    action!: reservation_actions;

    @Column
    title!: string;

    @Column({
        type: DataType.TEXT,
    })
    details!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column
    status!: order_receipt_status;

    @CreatedAt
    createdAt?: Date;

    @UpdatedAt
    updatedAt?: Date;

    //Relations
    @ForeignKey(() => SelledProduct)
    @Column
    selledProductId!: number;

    @BelongsTo(() => SelledProduct, { onDelete: 'CASCADE' })
    selledProduct!: SelledProduct;

    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User, "madeById")
    madeBy?: User;
}
