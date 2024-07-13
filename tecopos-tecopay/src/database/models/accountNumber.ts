import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
} from "sequelize-typescript";
import IssueEntity from "./issueEntity";

@Table
export default class AccountNumber extends Model {
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

  @Column({ defaultValue: false })
  isUsed!: boolean;
}
