import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    HasMany,
    HasOne,
    BelongsToMany,
} from "sequelize-typescript";
import Municipality from "./municipality";
import Province from "./province";
import Person from "./person";
import Business from "./business";
import Supplier from "./supplier";
import Client from "./client";
import ShippingRegion from "./shippingRegion";
import Country from "./country";
import User from "./user";
import ListUserAddress from "./listUserAddress";

@Table
export default class Address extends Model {
    @Column
    street_1!: string;

    @Column
    street_2!: string;

    @Column
    postalCode!: string;

    @Column
    city!: string;

    @Column
    coordinateLatitude!: string;

    @Column
    coordinateLongitude!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Municipality)
    @Column
    municipalityId!: number;

    @BelongsTo(() => Municipality)
    municipality!: Municipality;

    @ForeignKey(() => Province)
    @Column
    provinceId!: number;

    @BelongsTo(() => Province)
    province!: Province;

    @ForeignKey(() => Country)
    @Column
    countryId!: number;

    @BelongsTo(() => Country)
    country!: Country;

    @ForeignKey(() => ShippingRegion)
    @Column
    shippingRegionId!: number;

    @BelongsTo(() => ShippingRegion)
    shippingRegion!: ShippingRegion;

    @HasMany(() => Person)
    people!: Person[];

    @HasOne(() => Business)
    business!: Business;

    @HasMany(() => Supplier)
    suppliers!: Supplier[];

    @HasMany(() => Client)
    clients!: Client[];

    @BelongsToMany(() => User, {
        as: "addresses",
        through: { model: () => ListUserAddress, unique: false },
    })
    users?: User[];
}
