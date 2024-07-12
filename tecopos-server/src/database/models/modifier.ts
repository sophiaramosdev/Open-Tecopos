import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    Scopes,
    HasMany,
} from "sequelize-typescript";
import Area from "./area";
import Price from "./price";
import OrderReceiptModifier from "./orderReceiptModifier";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "type",
            "amount",
            "active",
            "index",
            "applyToGrossSales",
            "applyAcumulative",
            "applyFixedAmount",
            "showName",
            "observations",
        ],
        include: [
            {
                model: Area,
                attributes: ["id", "name"],
                paranoid: false,
            },
            {
                model: Price,
                attributes: ["amount", "codeCurrency"],
            },
        ],
    },
}))
export default class Modifier extends Model {
    @Column
    name!: string;

    @Column
    type!: "discount" | "tax";

    @Column({
        type: DataType.FLOAT,
    })
    amount!: number;

    @Column
    index!: number;

    @Column
    active!: boolean;

    @Column
    applyToGrossSales!: boolean;

    @Column
    applyAcumulative!: boolean;

    @Column
    applyFixedAmount!: boolean;

    @Column
    showName!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Area)
    @Column({
        onDelete: "CASCADE",
    })
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;

    @ForeignKey(() => Price)
    @Column
    fixedPriceId!: number;

    @BelongsTo(() => Price)
    fixedPrice!: Price;

    @HasMany(() => OrderReceiptModifier)
    ordersModifiers!: OrderReceiptModifier[];
}
