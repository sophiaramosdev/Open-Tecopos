import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import IssueEntity from "./issueEntity";
import User from "./user";
import Account from "./account";

@Table
export default class CardNumber extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  code!: string;

  @ForeignKey(() => IssueEntity)
  @Column({
    onDelete: "CASCADE",
  })
  issueEntityId!: number;

  @Column({defaultValue:false})
  isUsed!:boolean;
}