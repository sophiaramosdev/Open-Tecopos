import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
    Scopes,
} from "sequelize-typescript";
import Person from "./person";
import Area from "./area";
import { accessRecordType } from "../../interfaces/nomenclators";
import Image from "./image";
import PersonPost from "./personPost";
import PersonCategory from "./personCategory";
import User from "./user";

@Table
@Scopes(() => ({
    to_return: {
        attributes: ["id", "type", "createdAt"],
        include: [
            {
                model: Person,
                attributes: ["id", "firstName", "lastName"],
                include: [
                    {
                        model: Image,
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                    {
                        model: PersonPost,
                        attributes: ["name", "code"],
                    },
                    {
                        model: PersonCategory,
                        attributes: ["name", "code"],
                    },
                ],
            },
            {
                model: User,
                attributes: ["id", "displayName", "email"],
            },
            {
                model: Area,
                attributes: ["id", "name"],
            },
        ],
    },
}))
export default class PersonAccessRecord extends Model {
    @Column
    type!: accessRecordType;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => Person)
    @Column
    personId!: number;

    @BelongsTo(() => Person)
    person!: Person;

    @ForeignKey(() => Area)
    @Column
    areaId!: number;

    @BelongsTo(() => Area)
    area!: Area;

    @ForeignKey(() => User)
    @Column
    registeredById!: number;

    @BelongsTo(() => User)
    registeredBy!: User;
}
