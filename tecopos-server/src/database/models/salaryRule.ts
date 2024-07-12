import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
    Scopes,
} from "sequelize-typescript";
import Business from "./business";
import PersonCategory from "./personCategory";
import PersonPost from "./personPost";
import {
    counting,
    mode_tip,
    references_salary,
} from "../../interfaces/nomenclators";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "isFixedSalary",
            "counting",
            "amountFixedSalary",
            "referencePercent",
            "percentAmountToIncrement",
            "percentAmountToDecrement",
            "reference",
            "includeTips",
            "modeTips",
            "amountTip",
            "divideEquivalentByPost",
            "codeCurrency",
            "includeRechargeInSpecialHours",
            "specialHours",
            "restrictionsByDays",
            "amountSpecialHours",
            "restrictedDays",
        ],
        include: [
            {
                model: PersonPost,
                attributes: ["id", "name"],
            },
            {
                model: PersonCategory,
                attributes: ["id", "name"],
            },
            {
                model: Business,
                attributes: ["id", "name"],
            },
        ],
    },
}))
export default class SalaryRule extends Model {
    @Column
    name!: string;

    @Column
    codeCurrency!: string;

    @Column
    isFixedSalary!: boolean;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    amountFixedSalary!: number;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    referencePercent!: number;

    @Column
    percentAmountToIncrement!: number;

    @Column
    percentAmountToDecrement!: number;

    @Column
    reference!: references_salary;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    divideEquivalentByPost!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    includeTips!: boolean;

    @Column
    modeTips!: mode_tip;

    @Column
    counting!: counting;

    @Column
    amountTip!: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    includeRechargeInSpecialHours!: boolean;

    @Column
    specialHours!: string;

    @Column
    restrictionsByDays!: boolean;

    @Column
    restrictedDays!: string;

    @Column
    amountSpecialHours!: number;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @ForeignKey(() => PersonCategory)
    @Column
    personCategoryId!: number;

    @BelongsTo(() => PersonCategory)
    personCategory!: PersonCategory;

    @ForeignKey(() => PersonPost)
    @Column
    postId!: number;

    @BelongsTo(() => PersonPost)
    post!: PersonPost;
}
