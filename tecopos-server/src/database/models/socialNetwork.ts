import {
    Table,
    Column,
    Model,
    DeletedAt,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";

import { social_network_types } from "../../interfaces/nomenclators";
import Business from "./business";

@Table
export default class SocialNetwork extends Model {
    @Column
    user!: string;

    @Column
    url!: string;

    @Column
    type!: social_network_types;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    @ForeignKey(() => Business)
    @Column
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;
}
