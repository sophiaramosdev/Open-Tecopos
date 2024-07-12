import { SimplePrice } from "./commons";

export interface GeneralAreaIncome {
    totalSales: Array<SimplePrice>;
    totalSalesInMainCurrency: SimplePrice;

    totalCost: SimplePrice;

    totalIncomesInMainCurrency: SimplePrice;
    totalIncomesInCash: Array<SimplePrice>;
    totalIncomes: Array<SimplePrice>;
    totalIncomesNotInCash: Array<{
        amount: number;
        codeCurrency: string;
        paymentWay: string;
    }>;

    totalInCash: Array<SimplePrice>;
    totalInCashAfterOperations: Array<SimplePrice>;

    totalTips: Array<SimplePrice>;
    totalTipsMainCurrency: SimplePrice;

    totalCommissions: Array<SimplePrice>;
    totalDiscounts: Array<SimplePrice>;
    totalCouponsDiscounts: Array<SimplePrice>;
    totalShipping: Array<SimplePrice>;
    taxes: Array<SimplePrice>;
    totalHouseCosted: Array<SimplePrice>;

    totalCashOperations: Array<{
        amount: number;
        codeCurrency: string;
        type: string;
        operation: string;
    }>;

    totalSalary: SimplePrice;
}

export interface SimpleProductItem {
    productId: number;
    quantity: number;
    variationId?: number;
}

export interface ItemProductSelled extends SimpleProductItem {
    productionAreaId?: number | undefined;
    addons: Array<{
        id: number;
        quantity: number;
    }>;
    priceUnitary?: { amount: number, codeCurrency: string }
    resourceId?: number
    startDateAt?: string
    endDateAt?: string
    numberAdults?: number
    numberKids?: number
    isReservation?:boolean
    observations?:string
}
