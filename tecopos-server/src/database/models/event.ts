import { Column, DataType, Table, Model, BelongsTo, ForeignKey } from "sequelize-typescript";
import Business from "./business";


enum EventTypes {
    BLOCKING_TIME = "BLOCKINGTIME",
}
@Table
export default class Event extends Model {
    @Column
    title!: string;

    @Column({
        type: DataType.DATE
    })
    startAt!: Date;

    @Column({
        type: DataType.TEXT,
    })
    notes!: string

    @Column({
        type: DataType.DATE
    })
    endAt!: Date;

    @Column({
        type: DataType.STRING
    })
    eventType!: EventTypes;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;
}