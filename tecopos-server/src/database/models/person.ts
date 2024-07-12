import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    IsEmail,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
    HasMany,
    Scopes,
} from "sequelize-typescript";
import Address from "./address";
import Business from "./business";
import PersonCategory from "./personCategory";
import Phone from "./phone";
import PhonePerson from "./phonePerson";
import User from "./user";
import Image from "./image";
import PersonPost from "./personPost";
import PersonAccessRecord from "./personAccessRecord";
import PersonRecord from "./personRecord";
import SalaryReportPerson from "./salaryReportPerson";
import Municipality from "./municipality";
import Province from "./province";
import Country from "./country";
import { sex_type } from "../../interfaces/nomenclators";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "firstName",
            "lastName",
            "observations",
            "birthAt",
            "sex",
            "qrCode",
            "businessId",
            "barCode",
            "isInBusiness",
            "isActive",
        ],
        include: [
            {
                model: Address,
                attributes: [
                    "street_1",
                    "street_2",
                    "description",
                    "city",
                    "postalCode",
                ],
                include: [
                    {
                        model: Municipality,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Province,
                        attributes: ["id", "name", "code"],
                    },
                    {
                        model: Country,
                        attributes: ["id", "name", "code"],
                    },
                ],
            },
            {
                model: Phone,
                attributes: ["number", "description", "isMain", "isAvailable"],
                through: {
                    attributes: [],
                },
            },
            {
                model: User,
                attributes: ["id", "displayName", "email"],
            },
            {
                model: Image,
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
                model: PersonPost,
                attributes: ["id", "name", "code"],
            },
            {
                model: PersonCategory,
                attributes: ["id", "name", "code"],
            },
        ],
    },
}))
export default class Person extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    firstName!: string;

    @Column
    lastName!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isInBusiness!: boolean;

    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column
    sex!: sex_type;

    @Column
    birthAt!: Date;

    @Column
    qrCode!: string;

    @Column
    barCode!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business, "businessId")
    business!: Business;

    @ForeignKey(() => Address)
    @Column
    addressId!: number;

    @BelongsTo(() => Address)
    address?: Address;

    @ForeignKey(() => User)
    @Column
    userId!: number;

    @BelongsTo(() => User)
    user?: User;

    @BelongsToMany(() => Phone, () => PhonePerson)
    phones?: Phone[];

    @ForeignKey(() => PersonCategory)
    @Column
    personCategoryId!: number;

    @BelongsTo(() => PersonCategory)
    personCategory?: PersonCategory;

    @ForeignKey(() => PersonPost)
    @Column
    postId!: number;

    @BelongsTo(() => PersonPost)
    post?: PersonPost;

    @ForeignKey(() => Image)
    @Column
    profilePhotoId!: number;

    @BelongsTo(() => Image)
    profilePhoto!: Image;

    @HasMany(() => PersonAccessRecord)
    accessRecords!: PersonAccessRecord[];

    @HasMany(() => PersonRecord)
    records!: PersonRecord[];

    @HasMany(() => SalaryReportPerson)
    salaryPersonReports!: SalaryReportPerson[];
}
