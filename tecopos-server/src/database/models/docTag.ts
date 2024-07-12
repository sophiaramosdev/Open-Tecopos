import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
} from "sequelize-typescript";
import Business from "./business";
import Document from "./document";
import DocDocumentTag from "./docDocumentTag";

@Table
export default class DocTag extends Model {
    @Column
    name!: string;

    @ForeignKey(() => Business)
    @Column({
        onDelete: "CASCADE",
    })
    businessId!: number;

    @BelongsTo(() => Business)
    business!: Business;

    @BelongsToMany(() => Document, {
        through: { model: () => DocDocumentTag, unique: false },
    })
    documents?: Document[];
}
