import {
  Table,
  Model,
  Column,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo,
  Scopes,
  BeforeCreate,
  Unique,
} from "sequelize-typescript";
import Account from "./account";
import User from "./user";
import AccountOperation from "./accountOperation";
import moment from "moment";
import Category from "./category";
import CardRequest from "./cardRequest";

@Table
@Scopes(() => ({
  default: {
    attributes: [
      "id",
      "address",
      "holderName",
      "isActive",
      "isBlocked",
      "isDelivered",
      "deliveredAt",
      "expiratedAt",
      "minAmountWithoutConfirmation",
    ],
    include: [
      {
        model: CardRequest,
        as: "request",
        attributes: ["id", "queryNumber", "status"],
      },
      {
        model: Account,
        as: "account",
        attributes: ["address", "isActive"],
        include: [{ model: User, as: "owner", attributes: ["fullName"] }],
      },
      {
        model: Category,
        as: "category",
        attributes: ["name", "cardImageId"],
      },
    ],
  },
  minimal: {
    attributes: [
      "id",
      "address",
      "barCode",
      "isActive",
      "isDelivered",
      "accountId",
    ],
    include: [
      {
        model: CardRequest,
        as: "request",
        attributes: ["status"],
      },
    ],
  },
}))
export default class Card extends Model {
  @Column({ unique: true })
  address!: string;

  @Column({
    type: DataType.TEXT,
  })
  description!: string;

  @Column
  holderName!: string;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  deliveredAt!: Date;

  @Column({
    type: DataType.DATE,
    defaultValue: moment().add(5, "years"),
  })
  expiratedAt!: Date;

  @Column({
    type: DataType.DATE,
  })
  emitedAt!: Date;

  @Column
  securityPin!: string;

  @BeforeCreate
  static setSecurityPin(instance: Card) {
    instance.securityPin = instance.address.slice(-4);
  }

  @Column({
    type: DataType.INTEGER,
  })
  minAmountWithoutConfirmation!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isBlocked!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isActive!: boolean;

  @Column
  barCode!: string;

  @Column({
    defaultValue: false,
  })
  isDelivered!: boolean;

  @ForeignKey(() => User)
  @Column({
    onDelete: "CASCADE",
  })
  createdById!: number;

  @BelongsTo(() => User, "createdById")
  createdBy!: User;

  @ForeignKey(() => Account)
  @Column({
    onDelete: "CASCADE",
  })
  accountId!: number;

  @BelongsTo(() => Account, "accountId")
  account!: Account;

  @ForeignKey(() => CardRequest)
  @Column
  requestId!: number;

  @BelongsTo(() => CardRequest, "requestId")
  request!: CardRequest;

  @ForeignKey(() => Category)
  @Column
  categoryId!: number;

  @BelongsTo(() => Category)
  category!: Category;

  @HasMany(() => AccountOperation)
  operations!: AccountOperation[];
}
