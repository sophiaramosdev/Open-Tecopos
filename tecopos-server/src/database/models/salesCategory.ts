import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    BelongsToMany,
    Scopes,
} from "sequelize-typescript";
import Area from "./area";
import Business from "./business";
import CategorySalesPoint from "./categorySalesPoint";
import Image from "./image";
import Product from "./product";
import Coupon from "./coupon";
import AllowedCategoriesCoupon from "./allowedCategoriesCoupon";
import ExcludedCategoriesCoupon from "./excludedCategoriesCoupon ";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "description",
            "createdAt",
            "isActive",
            "visibleOnline",
            "color",
        ],
        include: [
            {
                model: Image,
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
        ],
    },
}))
export default class SalesCategory extends Model {
    @Column
    externalId!: string;

    @Column({
        allowNull: false,
    })
    name!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column
    universalCode!: number;

    @Column
    color!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    visibleOnline!: boolean;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    index!: number;

    @ForeignKey(() => Image)
    @Column
    imageId!: number;

    @BelongsTo(() => Image)
    image!: Image;

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

    @HasMany(() => Product)
    products!: Product[];

    @BelongsToMany(() => Area, {
        through: { model: () => CategorySalesPoint, unique: false },
    })
    salesPointAreas?: Area[];

    @BelongsToMany(() => Coupon, {
        as: "allowedSalesCategories",
        through: { model: () => AllowedCategoriesCoupon, unique: false },
    })
    allowedCoupons?: Coupon[];

    @BelongsToMany(() => Coupon, {
        as: "excludedSalesCategories",
        through: { model: () => ExcludedCategoriesCoupon, unique: false },
    })
    excludedCoupons?: Coupon[];
}
