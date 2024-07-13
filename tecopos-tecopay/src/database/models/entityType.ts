import {
  Table,
  Model,
  Column,
  ForeignKey,
  BelongsTo,
  Scopes,
  HasMany,
} from "sequelize-typescript";
import IssueEntity from "./issueEntity";
import Image from "./image";

@Table
@Scopes(() => ({
  default: {
    attributes: ["id", "name", "color"],
    include: [
      { model: Image, as: "icon", attributes: ["id", "url", "hash"] },
    ],
    order: [["id", "ASC"]],
  },
}))
export default class EntityType extends Model {
  @Column
  name!: string;

  @Column({defaultValue:'#808080'})
  color!: string;

  @ForeignKey(() => Image)
  @Column
  iconId!: number;

  @BelongsTo(() => Image, { as: "icon" })
  icon!: Image;

  @HasMany(() => IssueEntity)
  issueEntity!: IssueEntity;
}
