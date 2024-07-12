import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";

import StockMovement from "./stockMovement";
import User from "./user";

@Table
export default class MovementStateRecord extends Model {
    @Column
    status!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User)
    madeBy!: User;

    @ForeignKey(() => StockMovement)
    @Column
    stockMovementId!: number;

    @BelongsTo(() => StockMovement)
    stockMovement!: StockMovement;
}
