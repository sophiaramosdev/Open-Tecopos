import {
  Table,
  Model,
  Column,
  BelongsToMany,
  HasMany,
} from "sequelize-typescript";
import RolePermission from "./rolePermission";
import Permission from "./permissions";
import UserRole from "./userRole";

@Table
export default class Role extends Model {
  @Column
  name!: string;

  @Column
  code!: string;

  @Column
  description!: string;

  @Column
  reserved!:boolean;

  // Define the association with UserRole
  @HasMany(() => UserRole)
  userRoles!: UserRole[];

  @BelongsToMany(() => Permission, () => RolePermission)
  permissions!: Permission[];
}
