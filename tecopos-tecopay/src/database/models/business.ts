import { Table, Model, Column, DataType, HasOne } from "sequelize-typescript";
import IssueEntity from "./issueEntity";

@Table({ timestamps: false })
export default class Business extends Model {
  @Column({
    type: DataType.STRING,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
  })
  address!: string;

  @Column({
    type: DataType.INTEGER,
  })
  phone!: number;

  @Column
  externalId!: number;

  @HasOne(() => IssueEntity)
  issueEntity!: IssueEntity;
}
