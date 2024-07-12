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
import Business from "./business";
import SalaryReportPerson from "./salaryReportPerson";
import User from "./user";
import Image from "./image";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "startsAt",
            "endsAt",
            "codeCurrency",
            "status",
            "observations",
            "totalTips",
            "totalIncomes",
            "totalSales",
            "totalToPay",
            "generatedAt",
        ],
        include: [
            {
                model: User,
                as: "generatedBy",
                attributes: ["id", "email", "username", "displayName"],
                include: [
                    {
                        model: Image,
                        as: "avatar",
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
                paranoid: false,
            },
        ],
    },
}))
export default class SalaryReport extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.DATE,
    })
    startsAt!: Date;

    @Column({
        type: DataType.DATE,
    })
    endsAt!: Date;

    @Column({
        type: DataType.DATE,
    })
    generatedAt!: Date;

    @Column({
        type: DataType.TEXT,
    })
    economicCycleData!: string;

    @Column
    codeCurrency!: string;

    @Column
    status!: string;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column({
        type: DataType.FLOAT,
    })
    totalTips!: number;

    @Column({
        type: DataType.FLOAT,
    })
    totalIncomes!: number;

    @Column({
        type: DataType.FLOAT,
    })
    totalSales!: number;

    @Column({
        type: DataType.FLOAT,
    })
    totalToPay!: number;

    //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @HasMany(() => SalaryReportPerson)
    salaryReportPersons!: SalaryReportPerson[];

    @ForeignKey(() => User)
    @Column
    generatedById!: number;

    @BelongsTo(() => User)
    generatedBy!: User;
}
