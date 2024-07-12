import {
  Table,
  Column,
  Model,
  DeletedAt,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  HasMany,
  Scopes,
  IsEmail,
} from "sequelize-typescript";
import Address from "./address";

import Business from "./business";
import OrderReceipt from "./orderReceipt";
import Phone from "./phone";
import PhoneClient from "./phoneClient";
import Municipality from "./municipality";
import Province from "./province";
import User from "./user";
import Country from "./country";
import {
  customer_registration_way,
  customer_type,
  sex_type,
} from "../../interfaces/nomenclators";
import Coupon from "./coupon";
import ListUsedClientsCoupon from "./listUsedClientsCoupon";
import ListAllowedClientsCoupon from "./listAllowedClientsCoupon";
import ShippingRegion from "./shippingRegion";
import PrepaidPayment from "./prepaidPayment";
import Document from "./document";
import BusinessCategory from "./businessCategory";
import CustomerCategory from "./customerCategory";

@Table
@Scopes(() => ({
  to_return: {
    attributes: [
      "id",
      "firstName",
      "lastName",
      "email",
      "ci",
      "sex",
      "registrationWay",
      "birthAt",
      "observations",
      "externalId",
      "barCode",
      "legalNotes",
      "type",
      "codeClient",
      "contractNumber",
      "createdAt",
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
          {
            model: ShippingRegion,
            attributes: ["id", "name"],
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
      CustomerCategory
    ],
  },
}))
export default class Client extends Model {
  @Column
  firstName!: string;

  @Column
  lastName!: string;

  @IsEmail
  @Column
  email!: string;

  @Column
  barCode!: string;

  @Column
  codeClient!: number;

  @Column
  contractNumber!: string;

  @Column
  ci!: string;

  @Column
  sex!: sex_type;

  @Column({
    defaultValue: "person",
  })
  type!: customer_type;

  @Column
  registrationWay!: customer_registration_way;

  @Column
  birthAt!: Date;

  @Column({
    type: DataType.TEXT,
  })
  legalNotes!: string;

  @Column({
    type: DataType.TEXT,
  })
  observations!: string;

  @Column
  externalId!: number;

  @Column
  notificationToken!: string;

  //timestamps
  @DeletedAt
  deletedAt!: Date;

  //Relations
  @ForeignKey(() => Business)
  @Column({
    onDelete: "CASCADE",
  })
  businessId!: number;

  @BelongsTo(() => Business)
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

  @BelongsToMany(() => Phone, () => PhoneClient)
  phones?: Phone[];

  @HasMany(() => OrderReceipt)
  orderReceipts!: OrderReceipt[];

  @BelongsToMany(() => Coupon, {
    as: "usedCoupons",
    through: { model: () => ListUsedClientsCoupon, unique: false },
  })
  usedCoupons?: Coupon[];

  @BelongsToMany(() => Coupon, {
    as: "allowedCoupons",
    through: { model: () => ListAllowedClientsCoupon, unique: false },
  })
  allowedCoupons?: Coupon[];

  @HasMany(() => PrepaidPayment)
  prepaidPayments?: PrepaidPayment[];

  @HasMany(() => Document)
  documents?: Document[];

  @ForeignKey(() => CustomerCategory)
  @Column
  customerCategoryId!: number;

  @BelongsTo(() => CustomerCategory)
  customerCategory!: CustomerCategory;
}
