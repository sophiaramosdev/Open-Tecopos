import {
    Table,
    Column,
    Model,
    Scopes,
    BelongsToMany,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";

import Account from "./account";
import AccountAccountList from "./accountAccountList";
import User from "./user";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "name"],
        include: [
            {
                model: Account,
                as: "accounts",
                attributes: ["id", "name", "code"],
                through: {
                    attributes: [],
                },
            },
        ],
    },
}))
export default class AccountList extends Model {
    @Column
    name!: string;

    //Relations
    @BelongsToMany(() => Account, {
        through: { model: () => AccountAccountList, unique: false },
    })
    accounts?: Account[];

    @ForeignKey(() => User)
    @Column
    userId!: number;

    @BelongsTo(() => User)
    user!: User;
}
