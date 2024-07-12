import {
    Table,
    Column,
    Model,
    DataType,
    DeletedAt,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";

import { measureType } from "../../interfaces/nomenclators";
import Product from "./product";
import ProductionOrder from "./productionOrder";
import Image from "./image";
import AccessPointTicket from "./accessPointTicket";

@Table
export default class AccessPointProduct extends Model {
    @Column
    name!: string;

    @Column
    measure!: measureType;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0,
    })
    quantity!: number;

    //timestamps
    @DeletedAt
    deletedAt!: Date;

    //Relations
    @ForeignKey(() => AccessPointTicket)
    @Column
    accessPointTicketId!: number;

    @BelongsTo(() => AccessPointTicket)
    accessPointTicket!: AccessPointTicket;

    @ForeignKey(() => Product)
    @Column
    productId!: number;

    @BelongsTo(() => Product)
    product!: Product;

    @ForeignKey(() => Image)
    @Column
    imageId!: number;

    @BelongsTo(() => Image)
    image!: Image;
}
