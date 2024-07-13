import {
  Table,
  Model,
  Column,
  ForeignKey,
  BelongsTo,
  DataType,
  HasMany,
  Scopes,
} from "sequelize-typescript";
import IssueEntity from "./issueEntity";
import Image from "./image";
import Card from "./card";
import CardRequest from "./cardRequest";

@Table
@Scopes(() => ({
  default: {
    attributes: [
      "id",
      "name",
      "color",
      "isBasic",
      "price",
      "discount",
      "description",
      "isActive",
      "isPublic"
    ],
    include: [
      { model: Image, as: "cardImage", attributes: ["id", "url", "hash"] },
    ],
    order: [["id", "ASC"]],
  },
}))
export default class Category extends Model {
  @Column
  name!: string;

  @Column
  color!: string;

  @Column
  price!: string;

  @Column
  discount!: string;

  @Column({type:DataType.TEXT})
  description!: string;

  @Column
  criteria!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isActive!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isBasic!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isPublic!: boolean;

  @ForeignKey(() => Image)
  @Column
  cardImageId!: number;

  @BelongsTo(() => Image, "cardImageId")
  cardImage!: Image;

  // Relationships
  @ForeignKey(() => IssueEntity)
  @Column({
    onDelete: "CASCADE",
  })
  issueEntityId!: number;

  @BelongsTo(() => IssueEntity)
  issueEntity!: IssueEntity;

  @HasMany(() => Card, {
    onDelete: "CASCADE",
  })
  cards!: Card[];

  @HasMany(() => CardRequest)
  cardRequests!: CardRequest[];
}
