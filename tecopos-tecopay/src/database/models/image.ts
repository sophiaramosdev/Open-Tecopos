import {
  Model,
  DataType,
  Table,
  Column,
  HasOne,
} from "sequelize-typescript";
import Category from "./category";
import IssueEntity from "./issueEntity";

@Table
export default class Image extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  url!: string;

  @Column({
    type: DataType.TEXT,
  })
  description!: string;

  @Column({
    type: DataType.STRING,
  })
  hash!: string;

  @HasOne(() => Category, "cardImageId")
  category!: Category;

  @HasOne(() => IssueEntity, "bannerId")
  entityBanner!: IssueEntity;

  @HasOne(() => IssueEntity, "avatarId")
  entityAvatar!: IssueEntity;

  @HasOne(() => IssueEntity, "promotionalImageId")
  entityPromotionalImage!: IssueEntity;
}
