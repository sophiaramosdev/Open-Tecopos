import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    DataType,
    Scopes,
} from "sequelize-typescript";
import Person from "./person";
import User from "./user";
import Document from "./document";
import { person_record_types } from "../../interfaces/nomenclators";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "observations", "code", "createdAt"],
        include: [
            {
                model: User,
                attributes: ["displayName", "username", "email"],
                paranoid: false,
            },
            {
                model: Document,
                attributes: ["id", "path", "src"],
            },
        ],
    },
}))
export default class PersonRecord extends Model {
    @Column({
        type: DataType.TEXT,
    })
    observations!: string;

    @Column
    code!: person_record_types;

    //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @ForeignKey(() => Person)
    @Column
    personId!: number;

    @BelongsTo(() => Person)
    person!: Person;

    @ForeignKey(() => User)
    @Column
    registeredById!: number;

    @BelongsTo(() => User)
    registeredBy!: User;

    @ForeignKey(() => Document)
    @Column
    documentId!: number;

    @BelongsTo(() => Document)
    document!: Document;
}
