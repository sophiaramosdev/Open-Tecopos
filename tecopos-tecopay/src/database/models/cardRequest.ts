import {
  BelongsTo,
  Column,
  ForeignKey,
  HasMany,
  Model,
  Scopes,
  Table,
} from "sequelize-typescript";
import User from "./user";
import Card from "./card";
import Category from "./category";
import Image from "./image";
import { generateNoRepeatNumber } from "../../utils/helpers";
import RequestRecord from "./RequestRecords";

@Table
@Scopes(() => ({
  default: {
    attributes: [
      "id",
      "queryNumber",
      "holderName",
      "quantity",
      "priority",
      "status",
      "observations",
    ],
    include: [
      {
        model: User,
        as: "requestedTo",
        attributes: ["fullName"],
      },
      {
        model: Category,
        as: "category",
        attributes: ["id", "name", "cardImageId"],
        include: [
          {
            model: Image,
            as: "cardImage",
            attributes: ["id", "url", "hash"],
          },
        ],
      },
      {
        model: Card,
        as: "cards",
        attributes: ["id", "address"],
      },
    ],
  },
}))
export default class CardRequest extends Model {
  @Column
  holderName!: string;

  @Column({ defaultValue: 1 })
  quantity!: number;

  @Column({
    defaultValue: "REQUESTED",
  })
  status!: "REQUESTED" | "ACCEPTED" | "PRINTED" | "DENIED" | "CANCELLED";

  @Column
  observations!: string;

  @Column({ defaultValue: "NORMAL" })
  priority!: "NORMAL" | "EXPRESS";

  @Column({defaultValue:generateNoRepeatNumber(16)})
  queryNumber!: string;

  @ForeignKey(() => User)
  @Column
  requestedToId!: number;

  @BelongsTo(() => User)
  requestedTo!: User;

  @HasMany(() => Card)
  cards!: Card[];

  @HasMany(() => RequestRecord)
  records!: RequestRecord[];

  @ForeignKey(() => Category)
  @Column
  categoryId!: number;

  @BelongsTo(() => Category)
  category!: Category;
}
