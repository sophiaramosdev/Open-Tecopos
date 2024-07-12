import {
    Table,
    Column,
    Model,
    BelongsToMany,
    HasOne,
    DeletedAt,
} from "sequelize-typescript";
import Area from "./area";
import Business from "./business";
import ImageArea from "./imageArea";
import ImageBusiness from "./imageBusiness";
import ImageProduct from "./imageProduct";
import Product from "./product";
import ProductCategory from "./productCategory";
import SalesCategory from "./salesCategory";
import SelledProduct from "./selledProduct";
import Supplier from "./supplier";
import User from "./user";
import AccessPointProduct from "./accessPointProduct";
import Template from "./template";

@Table
export default class Image extends Model {
    @Column
    path!: string;

    @Column
    src!: string;

    @Column
    thumbnail!: string;

    @Column
    blurHash!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @BelongsToMany(() => Product, {
        through: { model: () => ImageProduct, unique: false },
    })
    products?: Product[];

    @BelongsToMany(() => Area, {
        through: { model: () => ImageArea, unique: false },
    })
    areas?: Area[];

    @BelongsToMany(() => Business, {
        through: { model: () => ImageBusiness, unique: false },
    })
    businesses?: Business[];

    @HasOne(() => ProductCategory)
    productCategory!: ProductCategory;

    @HasOne(() => Business, { foreignKey: "logoId" })
    business!: Business;

    @HasOne(() => Business, { foreignKey: "logoTicketId" })
    ticketBusiness!: Business;

    @HasOne(() => Business, { foreignKey: "bannerId" })
    bannerBusiness!: Business;

    @HasOne(() => SalesCategory)
    salesCategory!: SalesCategory;

    @HasOne(() => SelledProduct)
    selledProduct!: SelledProduct;

    @HasOne(() => User)
    user!: User;

    @HasOne(() => Template)
    template!: Template;

    @HasOne(() => Supplier)
    supplier!: Supplier;

    @HasOne(() => AccessPointProduct)
    accessPointProduct!: AccessPointProduct;
}
