import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table,
} from "sequelize-typescript";
import User from "./user";
import Role from "./roles";
import IssueEntity from "./issueEntity";

@Table
export default class UserRole extends Model {
  @ForeignKey(() => User)
  @Column
  userId!: number;

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => Role)
  @Column
  roleId!: number;

  @BelongsTo(() => Role)
  role!: Role;

  @ForeignKey(() => IssueEntity)
  @Column({allowNull:false})
  issueEntityId!: number;

  @BelongsTo(() => IssueEntity)
  issueEntity!: IssueEntity;
}
