import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import Account from "./account";
import User from "./user";
@Table
export default class CardRecord extends Model {
  @Column({
    type: DataType.ENUM,
    values: [
      "REQUESTED",
      "ACCEPTED",
      "REJECTED",
      "CANCELLED",
      "PRINTED"
    ],
    defaultValue: "REQUESTED",
  })
  action!: string;

  @Column({
    type: DataType.STRING,
  })
  title!: string;

  @Column({
    type: DataType.STRING,
  })
  observations!: string;


  @ForeignKey(() => Account)
  @Column({
    onDelete: "CASCADE",
  })
  cardId!: number;

  @BelongsTo(() => Account, "accountId")
  card!: Account;

  @ForeignKey(() => User)
  @Column({
    onDelete: "SET NULL",
  })
  madeById!: number;

  @BelongsTo(() => User, "madeById")
  madeBy!: User;
}
