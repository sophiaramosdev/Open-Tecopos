import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    HasMany,
    Scopes,
    BelongsToMany,
} from "sequelize-typescript";
import Business from "./business";

import StockMovement from "./stockMovement";
import Area from "./area";
import AreaProductState from "./areaProductState";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name"],
    },
}))
export default class ProductState extends Model {
    @Column
    name!: string;

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

    @HasMany(() => StockMovement)
    stockMovements!: StockMovement[];

    @HasMany(() => Area, "entryStateId")
    areasWithEntryStates!: Area[];

    @HasMany(() => Area, "outStateId")
    areasWithOutStates!: Area[];

    @BelongsToMany(() => Area, {
        through: { model: () => AreaProductState, unique: false },
    })
    areasProductStates?: Area[];
}
