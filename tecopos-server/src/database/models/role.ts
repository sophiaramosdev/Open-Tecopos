import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    BelongsToMany,
} from "sequelize-typescript";

import User from "./user";
import UserRole from "./userRole";
import { role_types, roles } from "../../interfaces/nomenclators";

@Table
export default class Role extends Model {
    @Column
    name!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    code!: roles;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column
    type!: role_types;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @BelongsToMany(() => User, {
        through: { model: () => UserRole, unique: false },
    })
    users?: Role[];
}
