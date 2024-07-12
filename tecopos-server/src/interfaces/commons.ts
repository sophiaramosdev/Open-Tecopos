import { measureType, payments_ways } from "./nomenclators";

export interface OrderProductPrice {
    price: number;
    codeCurrency: string;
    orderReceiptId?: number;
}

export interface SimplePrice {
    amount: number;
    codeCurrency: string;
}

export interface ExtendedPrice extends SimplePrice {
    paymentWay: payments_ways;
}

export interface IPVStateVariation {
    variationId: number;
    name: string;
    inStock: number;
    initial: number;
    entry: number;
    movements: number;
    outs: number;
    sales: number;
    onlineSales: number;
    processed: number;
    waste: number;
}

export interface IPVStateProduct {
    stockProductId: number;
    productId: number;
    name: string;
    image: string | undefined;
    measure: measureType;
    productCategory: string;
    productCategoryId: number;
    inStock: number;
    initial: number;
    entry: number;
    movements: number;
    outs: number;
    sales: number;
    onlineSales: number;
    processed: number;
    waste: number;
    variations: Array<IPVStateVariation>;
    enableGroup: boolean;
    groupName: string;
    groupConvertion: number;
}

export interface CycleDataReportItem {
    endsAt: string | undefined;
    economicCycleId: number | undefined;
    referencePercent: number;
    totalReferenceToPay: Array<SimplePrice>;
    percentIncreased: number;
    percentDecresed: number;

    //Inner columns
    startsAt: string;
    totalOrdersSalesInPOS: Array<SimplePrice>;
    totalOrdersManaged: Array<SimplePrice>;
    totalOrdersManagedByZone: Array<SimplePrice>;
    totalOrdersServed: Array<SimplePrice>;
    totalProductsProduced: Array<SimplePrice>;
    totalSales: Array<SimplePrice>;
    totalReferenceToPayInMainCurrency: SimplePrice;
    baseAmount: SimplePrice;
    tips: SimplePrice;
    amountFixed: SimplePrice;
    specialHours: SimplePrice;
    realToPay: SimplePrice;
    plusAmount: SimplePrice;
    observations: string;
}

export interface ResumedPerson {
    id: number;
    firstName: string;
    lastName: string;
    personCategory: {
        id: number;
        name: string;
    };
    post: {
        id: number;
        name: string;
    };
}

export interface SalaryReportItem {
    listEconomicCycles: Array<CycleDataReportItem>;
    amountEconomicCycles: number;
    person: ResumedPerson;

    //Outer columns
    totalOrdersSalesInPOS: Array<SimplePrice>;
    totalOrdersManaged: Array<SimplePrice>;
    totalOrdersManagedByZone: Array<SimplePrice>;
    totalOrdersServed: Array<SimplePrice>;
    totalProductsProduced: Array<SimplePrice>;
    totalSales: Array<SimplePrice>;
    totalReferenceToPay: Array<SimplePrice>;
    totalReferenceToPayInMainCurrency: SimplePrice;
    baseAmount: SimplePrice;
    tips: SimplePrice;
    amountFixed: SimplePrice;
    specialHours: SimplePrice;
    realToPay: SimplePrice;
    plusAmount: SimplePrice;
    observations: string;
}
