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
import Province from "./province";
import BillingAddress from "./billingAddress";
import ShippingAddress from "./shippingAddress";

@Table
export default class Municipality extends Model {
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

    @ForeignKey(() => Province)
    @Column
    provinceId!: number;

    @BelongsTo(() => Province)
    province!: Province;
}
