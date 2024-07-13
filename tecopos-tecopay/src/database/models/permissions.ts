import { Column, Model, Table } from "sequelize-typescript";
import { PermissionCodes } from "../../interfaces/serverInterfaces";

@Table
export default class Permission extends Model {
  @Column
  code!: PermissionCodes;

  @Column
  name!: string;

  @Column
  description?: string;
}
