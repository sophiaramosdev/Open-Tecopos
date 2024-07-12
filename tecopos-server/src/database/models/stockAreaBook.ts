import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import Area from "./area";
import EconomicCycle from "./economicCycle";
import User from "./user";

@Table
export default class StockAreaBook extends Model {
    @Column
    operation!: "OPEN" | "CLOSED";

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.TEXT,
    })
    state!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => User)
    @Column
    madeById!: number;

    @BelongsTo(() => User, "madeById")
    madeBy?: User;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;

    @ForeignKey(() => EconomicCycle)
    @Column({
        onDelete: "CASCADE",
    })
    economicCycleId!: number;

    @BelongsTo(() => EconomicCycle)
    economicCycle!: EconomicCycle;
}
