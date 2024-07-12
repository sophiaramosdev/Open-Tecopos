import {
    Table,
    Column,
    Model,
    DeletedAt,
    DataType,
    HasMany,
    HasOne,
    BelongsToMany,
} from "sequelize-typescript";

import ShippingRegion from "./shippingRegion";
import OrderReceipt from "./orderReceipt";
import Account from "./account";
import AccountBalance from "./accountBalance";
import AccountOperation from "./accountOperation";
import SubscriptionPlan from "./subscriptionPlan";
import Product from "./product";
import SelledProduct from "./selledProduct";
import StockMovement from "./stockMovement";
import SelledProductAddon from "./selledProductAddon";
import { payments_ways } from "../../interfaces/nomenclators";
import DispatchProduct from "./dispatchProduct";
import Business from "./business";
import Batch from "./batch";
import BuyedReceiptFixedCost from "./buyedReceiptFixedCost";
import Modifier from "./modifier";

@Table
export default class Price extends Model {
    @Column({
        allowNull: false,
        type: DataType.FLOAT,
    })
    amount!: number;

    @Column
    codeCurrency!: string;

    @Column
    paymentWay!: payments_ways;

    // //timestamps
    // @DeletedAt
    // deletedAt!: Date;

    //Relations
    @HasOne(() => ShippingRegion)
    shippingRegion!: ShippingRegion;

    @HasOne(() => SubscriptionPlan)
    subscriptionPlan!: SubscriptionPlan;

    @HasOne(() => OrderReceipt, "shippingPriceId")
    shippingOrder!: OrderReceipt;

    @HasOne(() => OrderReceipt, "tipPriceId")
    orderTipPrice!: OrderReceipt;

    @HasOne(() => OrderReceipt, "taxesId")
    orderTaxes!: OrderReceipt;

    @HasOne(() => OrderReceipt, "couponDiscountPriceId")
    couponDiscountsPrice!: OrderReceipt;

    @HasOne(() => OrderReceipt, "amountReturnedId")
    orderReturnedPrice!: OrderReceipt;

    @HasOne(() => AccountOperation)
    accountOperation!: AccountOperation;

    @HasOne(() => StockMovement)
    stockMovement!: StockMovement;

    @HasOne(() => SelledProductAddon)
    selledProductAddon!: SelledProductAddon;

    @HasOne(() => Business)
    business!: Business;

    @HasOne(() => SelledProduct, "priceTotalId")
    priceTotalSelledProduct!: SelledProduct;

    @HasOne(() => SelledProduct, "priceUnitaryId")
    priceUnitarySelledProduct!: SelledProduct;

    @HasOne(() => SelledProduct, "baseUnitaryPriceId")
    baseUnitaryPriceSelledProduct!: SelledProduct;

    @HasOne(() => DispatchProduct, "priceId")
    priceDispatchProduct!: DispatchProduct;

    @HasOne(() => DispatchProduct, "costId")
    costDispatchProduct!: DispatchProduct;

    @BelongsToMany(() => Account, () => AccountBalance)
    accounts?: Account[];

    @HasOne(() => Product)
    product!: Product;

    @HasOne(() => Batch, "grossCostId")
    grossCostPrices!: Batch;

    @HasOne(() => Batch, "netCostId")
    netCostPrices!: Batch;

    @HasOne(() => Batch, "registeredPriceId")
    registeredPrices!: Batch;

    @HasOne(() => BuyedReceiptFixedCost)
    buyedReceiptfixedCost!: BuyedReceiptFixedCost;

    @HasOne(() => Modifier)
    modifiers!: Modifier;
}
