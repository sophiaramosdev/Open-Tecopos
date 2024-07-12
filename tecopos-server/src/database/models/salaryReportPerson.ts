import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
    HasMany,
    Scopes,
} from "sequelize-typescript";
import Person from "./person";
import PersonCategory from "./personCategory";
import PersonPost from "./personPost";
import SalaryReport from "./salaryReport";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "personalData",
            "baseAmount",
            "codeCurrency",
            "specialHours",
            "plusAmount",
            "tips",
            "totalToPay",
            "otherPays",
            "accordance",
            "isPaid",
            "observations",
        ],
    },
}))
export default class SalaryReportPerson extends Model {
    @Column({
        type: DataType.TEXT,
    })
    personalData!: string;

    @Column({
        type: DataType.FLOAT,
    })
    baseAmount!: number;

    @Column
    codeCurrency!: string;

    @Column({
        type: DataType.FLOAT,
    })
    specialHours!: number;

    @Column({
        type: DataType.FLOAT,
    })
    plusAmount!: number;

    @Column({
        type: DataType.FLOAT,
    })
    tips!: number;

    @Column({
        type: DataType.FLOAT,
    })
    totalToPay!: number;

    @Column({
        type: DataType.FLOAT,
    })
    otherPays!: number;

    @Column
    accordance!: number;

    @Column
    isPaid!: boolean;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Person)
    @Column
    personId!: number;

    @BelongsTo(() => Person)
    person!: Person;

    @ForeignKey(() => PersonCategory)
    @Column
    personCategoryId!: number;

    @BelongsTo(() => PersonCategory)
    personCategory!: PersonCategory;

    @ForeignKey(() => PersonPost)
    @Column
    personPostId!: number;

    @BelongsTo(() => PersonPost)
    personPost!: PersonPost;

    @ForeignKey(() => SalaryReport)
    @Column
    salaryReportId!: number;

    @BelongsTo(() => SalaryReport)
    salaryReport!: SalaryReport;
}
