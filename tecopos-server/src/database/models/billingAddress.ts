import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import Municipality from "./municipality";
import Province from "./province";
import Country from "./country";
import OrderReceipt from "./orderReceipt";

@Table
export default class BillingAddress extends Model {
    @Column
    street_1!: string;

    @Column
    street_2!: string;

    @Column
    firstName!: string;

    @Column
    lastName!: string;

    @Column
    company!: string;

    @Column
    city!: string;

    @Column
    postalCode!: string;

    @Column
    email!: string;

    @Column
    phone!: string;

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

    @ForeignKey(() => OrderReceipt)
    @Column
    orderReceiptId!: number;

    @BelongsTo(() => OrderReceipt)
    orderReceipt!: OrderReceipt;
}
