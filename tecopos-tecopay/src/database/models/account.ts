import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Scopes,
  BelongsToMany,
} from "sequelize-typescript";
import IssueEntity from "./issueEntity";
import User from "./user";
import Card from "./card";
import AccountRecord from "./accountRecord";
import AccountOperation from "./accountOperation";

@Table
@Scopes(() => ({
  default: {
    attributes: [
      "id",
      "address",
      "code",
      "description",
      "isActive",
      "amount",
    ],
    include: [
      {
        model: IssueEntity,
        as: "issueEntity",
        attributes: ["id", "name"],
      },
      { model: User, as: "owner", attributes: ["id", "fullName"] },
    ],
  },
  return_owner: {
    attributes: ["address"],
    include: [{ model: User, as: "owner", attributes: ["id", "fullName"] }],
  },
  minimal: {
    attributes: ["address", "amount", "isActive"],
  },
}))
export default class Account extends Model {
  @Column({
    type: DataType.STRING,
    unique:true
  })
  address!: string;


  @Column({
    type: DataType.STRING,
  })
  code!: string;

  @Column({
    type: DataType.TEXT,
  })
  observations!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive!: boolean;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  amount!: number;

  @ForeignKey(() => User)
  @Column({
    onDelete: "RESTRICT",
  })
  ownerId!: number;

  @BelongsTo(() => User, "ownerId")
  owner!: User;

  @ForeignKey(() => IssueEntity)
  @Column({
    onDelete: "CASCADE",
  })
  issueEntityId!: number;

  @BelongsTo(() => IssueEntity, "issueEntityId")
  issueEntity!: IssueEntity;

  @HasMany(() => Card)
  cards!: Card[];

  @HasMany(() => AccountRecord)
  accountRecords!: AccountRecord[];

  @HasMany(() => AccountOperation)
  accountOperations!: AccountOperation[];
}
