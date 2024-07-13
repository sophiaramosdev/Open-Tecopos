import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  HasOne,
  HasMany,
  Scopes,
} from "sequelize-typescript";

import Account from "./account";
import IssueEntity from "./issueEntity";
import Card from "./card";
import AccountRecord from "./accountRecord";
import CardRequest from "./cardRequest";
import UserRole from "./userRole";
import Transaction from "./transactions";
import RequestRecord from "./RequestRecords";
import Role from "./roles";
import IssueEntitiesRecords from "./EntityRecords";

@Table
@Scopes(() => ({
  default: {
    attributes: [
      "id",
      "fullName",
      "username",
      "email",
      "fcmtoken",
      "isSuperAdmin",
    ],
    include: [
      {
        model: UserRole,
        as: "roles",
        attributes: ["issueEntityId"],
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["name"],
          },
        ],
      },
    ],
  },
}))
export default class User extends Model {
  @Column({
    type: DataType.INTEGER,
  })
  externalId!: number;

  @Column({
    type: DataType.STRING,
  })
  fullName!: string;

  @Column({
    type: DataType.STRING,
  })
  username!: string;

  @Column({ defaultValue: "0000" })
  pinPassword!: string;

  @Column({
    type: DataType.STRING,
  })
  email!: string;

  @Column({
    type: DataType.STRING,
  })
  phone!: string;

  @Column({
    type: DataType.STRING,
  })
  fcmtoken!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isSuperAdmin!: boolean;

  //Relations
  @HasOne(() => IssueEntity)
  entityOwn!: IssueEntity;

  @HasMany(() => Account, "ownerId")
  ownAccounts!: Account;

  @HasMany(() => Transaction)
  madeTransaction!: Transaction[];

  @HasMany(() => Account, "createdById")
  createdAccounts!: Account[];

  @HasMany(() => Card)
  createByCard!: Card[];

  @HasMany(() => UserRole)
  roles!: UserRole[];

  @HasMany(() => CardRequest)
  userRequestedTo!: CardRequest[];

  @HasMany(() => AccountRecord)
  madeByAccount!: AccountRecord[];

  @HasMany(() => RequestRecord)
  madeByRequest!: RequestRecord[];

  @HasMany(() => IssueEntitiesRecords)
  madeByEntityRecord!: IssueEntitiesRecords[];
}
