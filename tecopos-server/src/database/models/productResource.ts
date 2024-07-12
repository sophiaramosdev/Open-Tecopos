import {
  Table,
  Column,
  Model,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import Resource from "./resource";
import Product from "./product";

@Table
export default class ResourceProduct extends Model {
  @ForeignKey(() => Resource)
  @Column
  resourceId!: number;

  @BelongsTo(() => Resource)
  resource!: Resource;

  @ForeignKey(() => Product)
  @Column
  productId!: number;

  @BelongsTo(() => Product)
  product!: Product;
}
