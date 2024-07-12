import { PriceInvoiceInterface } from "./ServerInterfaces";
import { StockProduct } from "./Interfaces";

export interface SelectInterface {
  id: string | number | null;
  name: string;
  disabled?: boolean;
}

export interface FilterCodeDatePickerRange {
  includingTime?: boolean | undefined;
  isUnitlToday: boolean | undefined;
  filterCode: string;
  name: string;
}

export interface FilterCodePriceRange {
  filterCode: string;
  name: string;
  currencies?: string[]
}

export interface SelledProductReport {
  salesCategory: string;
  products: {
    name: string;
    areaSale: string;
    salesPrice: PriceInvoiceInterface[];
    quantity: number;
    totalCost: PriceInvoiceInterface;
    totalSale: PriceInvoiceInterface[];
    enableGroup: boolean;
    groupConvertion: number;
    groupName: string;
    totalQuantity: number;
  }[];
  subtotals: {
    quantity?: number;
    totalSale?: PriceInvoiceInterface[];
    totalCost?: PriceInvoiceInterface;
  };
}

export interface OrdersProductReport {
  client: {id:number, name:string};
  data: {
    operationNumber: number;
    status:string;
    origin:string;
    areaSale: string;
    totalCost: number;
    payment: PriceInvoiceInterface[]; 
    payed:boolean;     
  }[];
  subtotals: {
    totalToPay:PriceInvoiceInterface[];
    totalPayed:PriceInvoiceInterface[];
    totalCost: number;
  };
}

export interface SelectedProductsForBilling {
  id: number | string;
  quantity: number;
  price: {price:number, codeCurrency: string};
  product: StockProduct
}
export type BasicType = Record<string, string | number | boolean | null>;

export interface ApplyCouponBody {
  coupons: string[];
  listProducts: {
    productId: number;
    variationId: number | null;
    quantity: number;
  }[];
}