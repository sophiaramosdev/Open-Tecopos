import { Table, Column, Model, DeletedAt } from "sequelize-typescript";

@Table
export default class Attribute extends Model {
    @Column
    name!: string;

    @Column
    code!: string;

    //timestamps
    @DeletedAt
    deletedAt!: Date;
}
