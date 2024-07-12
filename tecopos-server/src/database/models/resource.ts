import {
  Table,
  Column,
  Model,
  DataType,
  DeletedAt,
  ForeignKey,
  BelongsTo,
  Scopes,
  BelongsToMany,
  HasMany,
} from "sequelize-typescript";
import Area from "./area";
import OrderReceipt from "./orderReceipt";
import OrderResource from "./orderResource";
import Zone from "./zone";
import Product from "./product";
import ResourceProduct from "./productResource";
import Business from "./business";

@Table
@Scopes(() => ({
  to_return: {
    attributes: [
      "id",
      "code",
      "numberClients",
      "numberAdults",
      "description",
      "numberKids",
      "isAvailable",
      "isReservable",
      "type",
    ],
    include: [
      {
        model: Area,
        attributes: ["name"],
        paranoid: false,
      },
    ],
  },
}))
export default class Resource extends Model {
  @Column
  code!: string;

  @Column
  name!: string;

  @Column
  description!: string;

  @Column({
    type: DataType.INTEGER,
  })
  numberClients!: number;

  @Column({
    type: DataType.INTEGER,
  })
  numberAdults!: number;

  @Column({
    type: DataType.INTEGER,
  })
  numberKids!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isAvailable!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isReservable!: boolean;

  @Column({
    defaultValue: "TABLE",
  })
  type!: "TABLE";

  //timestamps
  @DeletedAt
  deletedAt!: Date;

  //Relations
  @ForeignKey(() => Area)
  @Column
  areaId!: number;

  @BelongsTo(() => Area)
  area!: Area;

  @BelongsToMany(() => OrderReceipt, {
    through: { model: () => OrderResource, unique: false },
  })
  orders?: OrderReceipt[];

  @ForeignKey(() => Zone)
  @Column
  zoneId!: number;

  @BelongsTo(() => Zone)
  zone!: Zone;

  @BelongsToMany(() => Product, {
    through: () => ResourceProduct,
    foreignKey: "resourceId",
    otherKey: "productId",
  })
  products?: Product[];

  @ForeignKey(() => Business)
  @Column({
    onDelete: "CASCADE",
  })
  businessId!: number;

  @BelongsTo(() => Business)
  business!: Business;
}
