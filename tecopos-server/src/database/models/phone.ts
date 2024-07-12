import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
} from "sequelize-typescript";
import Business from "./business";
import Client from "./client";
import Person from "./person";
import PhoneBusiness from "./phoneBusiness";
import PhoneClient from "./phoneClient";
import PhonePerson from "./phonePerson";
import PhoneSupplier from "./phoneSupplier";
import Supplier from "./supplier";

@Table
export default class Phone extends Model {
    @Column
    number!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isMain!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isAvailable!: boolean;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @BelongsToMany(() => Business, () => PhoneBusiness)
    business?: Business[];

    @BelongsToMany(() => Supplier, () => PhoneSupplier)
    suppliers?: Supplier[];

    @BelongsToMany(() => Client, () => PhoneClient)
    clients?: Client[];

    @BelongsToMany(() => Person, () => PhonePerson)
    people?: Person[];
}
