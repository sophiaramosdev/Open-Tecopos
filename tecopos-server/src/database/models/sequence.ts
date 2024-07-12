import {
    Table,
    Column,
    Model,
    DataType,
    Scopes,
    HasMany,
} from "sequelize-typescript";
import Tv from "./tv";

@Table
@Scopes(() => ({
    to_return: {
        attributes: [
            "id",
            "name",
            "code",
            "meta",
            "description",
            "createdAt",
            "isActive",
        ],
    },
}))
export default class Sequence extends Model {
    @Column
    name!: string;

    @Column({
        allowNull: false,
    })
    code!: string;

    @Column({
        type: DataType.TEXT,
    })
    meta!: string;

    @Column({
        type: DataType.TEXT,
    })
    description!: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive!: boolean;

    @HasMany(() => Tv)
    tvs!: Tv[];
}
