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
export default class AccountRecord extends Model {
  @Column({
    type: DataType.ENUM,
    values: [
      "CREATED",
      "UPDATED",
      "ACTIVATED",
      "DISABLED"
    ],
    defaultValue: "CREATED",
  })
  code!: string;

  @Column({
    type: DataType.STRING,
  })
  title!: string;

  @Column({
    type: DataType.STRING,
  })
  details!: string;


  @ForeignKey(() => Account)
  @Column({
    onDelete: "CASCADE",
  })
  accountId!: number;

  @BelongsTo(() => Account, "accountId")
  account!: Account;

  @ForeignKey(() => User)
  @Column({
    onDelete: "SET NULL",
  })
  madeById!: number;

  @BelongsTo(() => User, "madeById")
  madeBy!: User;
}
