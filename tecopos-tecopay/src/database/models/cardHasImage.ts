import { Table, Model, ForeignKey, Column, BelongsTo } from "sequelize-typescript";
import Image from "./image";
// import Card from "./card";
import Category from "./category";

@Table
export default class CardHasImage extends Model {
  @ForeignKey(() => Image)
  @Column({
    onDelete: "CASCADE",
  })
  imageId!: number;

  @BelongsTo(() => Image)
  image!: Image;

  @ForeignKey(() => Category)
  @Column
  categoryId!: number;

  @BelongsTo(() => Category, "categoryId")
  category!: Category;

}