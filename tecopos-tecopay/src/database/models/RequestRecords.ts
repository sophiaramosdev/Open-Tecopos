import {
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  Model,
} from "sequelize-typescript";
import CardRequest from "./cardRequest";
import User from "./user";
import { DataTypes } from "sequelize";

@Table
export default class RequestRecord extends Model {
  @Column
  status!: "REGISTERED" | "MODIFIED" | "CLOSED" ;

  @Column({type:DataTypes.TEXT})
  description!: string;

  @ForeignKey(() => CardRequest)
  @Column({ onDelete: "CASCADE" })
  requestId!: number;

  @BelongsTo(() => CardRequest)
  request!: CardRequest;

  @ForeignKey(() => User)
  @Column
  madeById!: number;

  @BelongsTo(() => User, "madeById")
  madeBy!: User;
}
