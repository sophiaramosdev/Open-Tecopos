import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    Scopes,
    HasMany,
} from "sequelize-typescript";
import Business from "./business";
import Price from "./price";
import Province from "./province";
import Municipality from "./municipality";
import Address from "./address";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "description"],
        include: [
            {
                model: Price,
                attributes: ["amount", "codeCurrency"],
            },
            {
                model: Municipality,
                attributes: ["id", "name", "code"],
            },
            {
                model: Province,
                attributes: ["id", "name", "code"],
            },
        ],
    },
}))
export default class ShippingRegion extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column
    description!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @ForeignKey(() => Price)
    @Column
    priceId!: number;

    @BelongsTo(() => Price)
    price!: Price;

    @ForeignKey(() => Province)
    @Column
    provinceId!: number;

    @BelongsTo(() => Province)
    province!: Province;

    @ForeignKey(() => Municipality)
    @Column
    municipalityId!: number;

    @BelongsTo(() => Municipality)
    municipality!: Municipality;

    @HasMany(() => Address)
    addresses!: Address[];
}
