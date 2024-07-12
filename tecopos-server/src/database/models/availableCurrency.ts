import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    HasMany,
} from "sequelize-typescript";

import Business from "./business";
import Currency from "./currency";

@Table
export default class AvailableCurrency extends Model {
    @Column({
        type: DataType.FLOAT,
        allowNull: false,
    })
    exchangeRate!: number;

    @Column({
        type: DataType.FLOAT,
    })
    oficialExchangeRate!: number;

    @Column({
        defaultValue: 0,
    })
    precissionAfterComma!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isMain!: boolean;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @ForeignKey(() => Currency)
    @Column
    currencyId!: number;

    @BelongsTo(() => Currency)
    currency!: Currency;
}
