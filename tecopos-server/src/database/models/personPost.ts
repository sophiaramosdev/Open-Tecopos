import {
    Table,
    Column,
    Model,
    DeletedAt,
    HasMany,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";
import Person from "./person";
import Business from "./business";
import SalaryRule from "./salaryRule";
import SalaryReportPerson from "./salaryReportPerson";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name", "code"],
    },
}))
export default class PersonPost extends Model {
    @Column({
        allowNull: false,
    })
    name!: string;

    @Column
    code!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @HasMany(() => Person)
    people!: Person[];

    @HasMany(() => SalaryRule)
    salaryRules!: SalaryRule[];

    @HasMany(() => SalaryReportPerson)
    salaryReportPersons!: SalaryReportPerson[];

    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;
}
