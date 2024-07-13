import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Scopes,
  BeforeDestroy,
  HasOne,
} from "sequelize-typescript";
import User from "./user";
import Account from "./account";
import Business from "./business";
import CardRequest from "./cardRequest";
import Image from "./image";
import Category from "./category";
import AccountNumber from "./accountNumber";
import CardNumber from "./cardNumber";
import UserRole from "./userRole";
import EntityType from "./entityType";
import EntitiesRecord from "./EntityRecords";

@Table
@Scopes(() => ({
  default: {
    attributes: [
      "id",
      "name",
      "status",
      "address",
      "color",
      "phone",
      "color",
      "allowCreateAccount",
      "allowPromotion",
      "description",
    ],
    include: [
      {
        model: User,
        as: "owner",
        attributes: ["id", "fullName"],
      },
      {
        model: Category,
        as: "categories",
        attributes: [
          "id",
          "name",
          "isBasic",
          "isPublic",
          "isActive",
          "color",
          "price",
          "discount",
          "description",
        ],
        include: [
          { model: Image, as: "cardImage", attributes: ["id", "url", "hash"] },
        ],
      },
      { model: Business, as: "business", attributes: ["id", "name"] },
      { model: Image, as: "banner", attributes: ["id", "url", "hash"] },
      { model: Image, as: "avatar", attributes: ["id", "url", "hash"] },
      { model: Image, as: "promotionalImage", attributes: ["id", "url", "hash"] },
      {
        model: EntityType,
        as: "entityType",
        attributes: ["id", "name", "color"],
        include: [
          { model: Image, as: "icon", attributes: ["id", "url", "hash"] },
        ],
      },
    ],
  },
}))
export default class IssueEntity extends Model {
  @Column({
    type: DataType.STRING,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
  })
  address!: string;

  @Column({
    type: DataType.STRING,
  })
  phone!: string;

  @Column({
    defaultValue: "ACTIVE",
  })
  status!: "ACTIVE" | "INACTIVE";

  @Column({ type: DataType.TEXT })
  description!: string;

  @Column({ type: DataType.TEXT })
  observations!: string;

  @Column({ defaultValue: false })
  allowPromotion!: boolean;

  @Column({ defaultValue: "#808080" })
  color!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  allowCreateAccount!: boolean;

  @HasMany(() => Account, { onDelete: "CASCADE", hooks: true })
  accounts!: Account[];

  @ForeignKey(() => User)
  @Column({
    onDelete: "CASCADE",
  })
  ownerId!: number;

  @BelongsTo(() => User, "ownerId")
  owner!: User;

  @ForeignKey(() => Business)
  @Column({
    onDelete: "CASCADE",
  })
  businessId!: number;

  @BelongsTo(() => Business, "businessId")
  business!: Business;

  @ForeignKey(() => Image)
  @Column
  bannerId!: number;

  @BelongsTo(() => Image, "bannerId")
  banner!: Image;

  @ForeignKey(() => Image)
  @Column
  avatarId!: number;

  @BelongsTo(() => Image, "avatarId")
  avatar!: Image;

  @ForeignKey(() => Image)
  @Column({ onDelete: "SET NULL" })
  promotionalImageId!: number;

  @BelongsTo(() => Image, "promotionalImageId")
  promotionalImage!: Image;

  @ForeignKey(() => EntityType)
  @Column
  entityTypeId!: number;

  @BelongsTo(() => EntityType)
  entityType!: EntityType;

  @HasMany(() => Category)
  categories!: Category[];

  @HasMany(() => AccountNumber)
  accountNumber!: AccountNumber[];

  @HasMany(() => CardNumber)
  cardNumber!: CardNumber[];

  @HasMany(() => UserRole)
  userRoles!: UserRole[];

  @HasMany(() => EntitiesRecord)
  entityRecords!: EntitiesRecord[];

}
