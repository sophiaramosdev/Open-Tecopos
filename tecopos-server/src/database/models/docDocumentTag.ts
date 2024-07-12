import { Table, Column, Model, ForeignKey } from "sequelize-typescript";
import DocTag from "./docTag";
import Document from "./document";

@Table
export default class DocDocumentTag extends Model {
    @ForeignKey(() => DocTag)
    @Column({
        unique: false,
    })
    docTagId!: number;

    @ForeignKey(() => Document)
    @Column({
        unique: false,
    })
    documentId!: number;
}
