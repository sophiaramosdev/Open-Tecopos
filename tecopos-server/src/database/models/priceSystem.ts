import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
    HasMany,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";
import ProductPrice from "./productPrice";
import EconomicCycle from "./economicCycle";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "isMain"],
    },
}))
export default class PriceSystem extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isMain!: boolean;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @HasMany(() => ProductPrice)
    prices!: ProductPrice[];

    @HasMany(() => EconomicCycle)
    economicCycles!: EconomicCycle[];
}
