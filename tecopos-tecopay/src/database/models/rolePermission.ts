import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table,
} from "sequelize-typescript";
import Role from "./roles";
import Permission from "./permissions";

@Table
export default class RolePermission extends Model {
  @ForeignKey(() => Role)
  @Column
  roleId!: number;

  @ForeignKey(() => Permission)
  @Column
  permissionId!: number;

  @BelongsTo(() => Role)
  role!: Role;

  @BelongsTo(() => Permission)
  permission!: Permission;
}
