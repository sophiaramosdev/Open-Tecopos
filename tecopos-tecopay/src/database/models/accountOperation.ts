import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import Account from "./account";
import Card from "./card";
import Transaction from "./transactions";
import Transactions from "./transactions";

@Table
export default class AccountOperation extends Model {
  @Column({
    type: DataType.FLOAT,
  })
  amount!: number;

  @Column({
    defaultValue: 0,
  })
  taxAmount!: number;

  @ForeignKey(() => Card)
  @Column
  cardId!: number;

  @BelongsTo(() => Card, "cardId")
  card!: Card;

  @ForeignKey(() => Account)
  @Column
  accountId!: number;

  @BelongsTo(() => Account, "accountId")
  account!: Account;

  @ForeignKey(() => Transactions)
  @Column
  transactionId!: number;

  @BelongsTo(() => Transactions)
  transaction!: Transactions;
}
