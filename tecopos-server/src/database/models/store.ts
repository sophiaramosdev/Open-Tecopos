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
import Business from "./business";
import { store_types } from "../../interfaces/nomenclators";

@Table
export default class Store extends Model {
    @Column
    type!: store_types;

    @Column({
        type: DataType.TEXT,
    })
    data!: string;

    @Column
    madeAt!: Date;

    //timestamps
    // @DeletedAt
    // deletedAt!: Date;

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
    @Column
    economicCycleId!: number;

    @BelongsTo(() => EconomicCycle)
    economicCycle!: EconomicCycle;

    @ForeignKey(() => Business)
    @Column
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;
}
