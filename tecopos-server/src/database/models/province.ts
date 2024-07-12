import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    HasMany,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import Address from "./address";
import Municipality from "./municipality";
import Country from "./country";
import BillingAddress from "./billingAddress";
import ShippingAddress from "./shippingAddress";

@Table
export default class Province extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    code!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @HasMany(() => Address)
    addresses!: Address[];

    @HasMany(() => BillingAddress)
    billingAddresses!: BillingAddress[];

    @HasMany(() => ShippingAddress)
    shippingAddresses!: ShippingAddress[];

    @HasMany(() => Municipality)
    municipalities!: Municipality[];

    @ForeignKey(() => Country)
    @Column
    countryId!: number;

    @BelongsTo(() => Country)
    country!: Country;
}
