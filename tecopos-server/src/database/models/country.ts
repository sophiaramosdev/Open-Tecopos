import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    HasMany,
} from "sequelize-typescript";
import Address from "./address";
import Province from "./province";
import BillingAddress from "./billingAddress";
import ShippingAddress from "./shippingAddress";

@Table
export default class Country extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
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

    @HasMany(() => Province)
    provinces!: Province[];
}
