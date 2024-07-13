import {
  BelongsTo,
  Column,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from "sequelize-typescript";
import User from "./user";
import AccountOperation from "./accountOperation";

@Table
export default class Transactions extends Model {
  @Column
  transactionNumber!: string;

  @Column
  type!: "TRANSFER" | "DEPOSIT" | "PAYMENT";

  @Column
  description!: string;

  @ForeignKey(() => User)
  @Column
  madeById!: number;

  @BelongsTo(() => User)
  madeBy!: User;

  @HasMany(() => AccountOperation)
  operations!: AccountOperation;
}
