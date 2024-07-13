import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import IssueEntity from "./issueEntity";
import User from "./user";

@Table
export default class EntitiesRecord extends Model {
  @Column({
    type: DataType.ENUM,
    values: ["REGISTERED", "UPDATED", "DELETED"],
    defaultValue: "REGISTERED",
  })
  code!: string;

  @Column({
    type: DataType.TEXT,
  })
  description!: string;

  @ForeignKey(() => IssueEntity)
  @Column({
    onDelete: "CASCADE",
    allowNull: true,
  })
  entityId!: number;

  @BelongsTo(() => IssueEntity, "entityId")
  entity!: IssueEntity;

  @ForeignKey(() => User)
  @Column({
    onDelete: "SET NULL",
  })
  madeById!: number;

  @BelongsTo(() => User, "madeById")
  madeBy!: User;
}
