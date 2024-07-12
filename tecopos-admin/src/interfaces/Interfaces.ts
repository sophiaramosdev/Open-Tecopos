import { ImageInterface, StockVariationInterface } from './ServerInterfaces';
import { ReservationPolicy } from './ServerInterfaces';
import {
  accountOperationType,
  cash_register_operations,
  measureType,
  operation_movements_types,
  operation_movement_status_types,
  order_receipt_status,
  payments_ways,
  selled_products_status,
} from './nomenclators';

export interface Session {
  token: string;
  refresh_token: string;
}
export interface PriceSystems {
  id: number;
  name: string;
  isMain: boolean;
}

export interface Business {
  id: number;
  name: string;
  businessCategory: BusinessCategory;
  logo: ImageInterface;
  //status: business_status;
  promotionalText: string;
  description: string;
  isActive: boolean;
  dni: string;
  //type: business_types;
  email: string;
  footerTicket: string;
  images: Array<Image>;
  subscriptionPlanId: number;
  addressId: number;
  createdAt: Date;
  configurationsKey: Array<ConfigurationKey>;
  availableCurrencies: Array<Currency>;
  mainCurrency: string;
}

export interface Image {
  id: number;
  src: string;
  thumbnail: string;
}

export interface BusinessCategory {
  id: number;
  name: string;
  description: string;
}

export interface ConfigurationKey {
  key:
  | 'tax_rate'
  | 'payment_methods_enabled'
  | 'enabled_discounts'
  | 'print_number_order'
  | 'default_method_payment'
  | 'stock_type_products'
  | 'type_products'
  | 'enable_ongoing_orders'
  | 'enable_testing_orders_printing'
  | 'open_cashbox_at_print'
  | 'extract_salary_from_cash'
  | 'cash_operations_include_tips'
  | 'cash_operations_include_deliveries';
  value: string;
}

export interface PublicConfigs {
  key:
  | 'is_maintenance_tecopos'
  | 'tecopos_min_version_ios'
  | 'tecopos_min_version_android'
  | 'tecopos_url_google_play'
  | 'tecopos_url_app_store';
  value: string;
}

export interface Currency {
  id: number;
  exchangeRate: number;
  isActive: boolean;
  isMain: boolean;
  name: string;
  code: string;
  symbol: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: Image;
  isActive: boolean;
  isSuperAdmin: boolean;
  isLogued: boolean;
  lastLogin: Date;
  businessId: number;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<Role>;
  displayName: string;
  allowedStockAreas: Array<Area>;
  allowedSalesAreas: Array<Area>;
  allowedManufacturerAreas: Array<Area>;
}

export interface UserReduced {
  username: string;
  email: string;
  avatar: Image;
  displayName: string;
}

export interface UserToLogin {
  id: number;
  username: string;
  email: string;
  avatar: Image;
  roles: Array<Role>;
  lastLogin: Date;
}

export interface Role {
  id: number;
  name: string;
  code: string;
}

export interface Area {
  id: number;
  name: string;
  code: string;
  description: string;
  type: 'SALE' | 'MANUFACTURER' | 'STOCK';
  isActive: boolean;
  isMainStock: boolean;
  images: Array<Image>;
  otherItemsAvailable: boolean;
  restrictToMyStock: boolean;
  salesMode: 'SHOP' | 'RESTAURANT';
  businessId: number;
  stockAreaId: number;
  productionMode: 'SERIAL' | 'BYORDERS';
  initialStock: {
    id: number;
    name: string;
  };
  endStock: {
    id: number;
    name: string;
  };
}

export interface CashRegisterOperation {
  id: number;
  amount: number;
  codeCurrency: string;
  observations: string;
  operation: cash_register_operations;
  type: accountOperationType;
  economicCycleId: number;
  operationNumber: number
  paymentDateClient: string
  bankReferenceNumber: string
  areaId: number;
  createdAt: Date;
  details: string
  madeBy: {
    id: number;
    username: string;
    displayName: string;
  };
}

export interface StockAreaProduct {
  id: number;
  quantity: number;
  type: string;
  productId: number;
  areaId: number;
  createdAt: string;
  updatedAt: string;
  variations: StockVariationInterface[];
}

export interface ProductionArea {
  id: number;
  name: string;
  stockAreaId: number;
}

export interface ProductSale {
  id: number;
  name: string;
  salesCode: string;
  description: string | null;
  promotionalText: string | null;
  type: string;
  showForSale: boolean;
  stockLimit: boolean;
  qrCode: string | null;
  totalQuantity: number;
  measure: string;
  suggested: boolean;
  onSale: boolean;
  alertLimit: number | null;
  isPublicVisible: boolean;
  averagePreparationTime: number | null;
  elaborationSteps: string | null;
  averageCost: number;
  isAlertable: boolean;
  productCategoryId: number | null;
  salesCategoryId: number | null;
  groupName: string | null;
  groupConvertion: number;
  isWholesale: boolean;
  minimunWholesaleAmount: number;
  enableGroup: boolean;
  saleByWeight: boolean;
  performance: number;
  onSaleType: string | null;
  onSaleDiscountAmount: number | null;
  productCategory:any ; 
  salesCategory: SalesCategory; 
  onSalePrice: {amount:number,codeCurrency:string} | null;
  stockAreaProducts: StockAreaProduct[];
  listProductionAreas: ProductionArea[];
  images: Image[]; 
  variations: StockVariationInterface[]; 
  prices: Price[];
  compositions: any[]; 
}
export interface Product {
  id: number;
  name: string;
  salesCode: string;
  description: string;
  promotionalText: string;
  type: string;
  showForSale: boolean;
  isPublicVisible: boolean;
  qrCode: string;

  totalQuantity: number;
  measure: measureType;
  alertLimit: number;
  isAlertable: boolean;
  isAccountable: boolean;
  averageCost: number;

  isAddon: boolean;
  averagePreparationTime: number;
  elaborationSteps: string;
  images: Array<Image>;
  hasDuration: boolean
  duration: string
  availableForReservation: boolean
  alwaysAvailableForReservation: boolean
  reservationAvailableFrom: string
  reservationAvailableTo: string
  reservationPolicies: ReservationPolicy[]
  resources:Resource[]
  businessId: number;
  salesCategoryId: number;
  productCategoryId: number;
  preparationAreaId: number;
  createdAt: Date;
  productCategory: ProductCategory;
  salesCategory: SalesCategory;
  stockAreaProducts: Array<{ productId: number; quantity: number }>;
  prices: Array<ProductPrice>;

  quantity: number;
  areaId: number;
  availableAddons?: Array<Addon>;
  listProductionAreas?: Array<Area>;
  listManufacturations?: Array<Product>;

  combo: Array<Product>;
  onSale: boolean;
  suggested: boolean;
  onSalePrice: Price;

  stockLimit: boolean;
  supplies: Array<Supply>;
}

export interface Supply {
  id: number;
  quantity: number;
  baseProductId: number;
  supplyId: number;
  name: string;
  measure: string;
  cost: number;
}

export interface StockProduct {
  id: number;
  product: Product;
  quantity: number;
}

export interface StockMovement {
  id: number;
  quantity: number;
  costBeforeOperation: number;
  parentId: number;
  operation: operation_movements_types;
  description: string;
  status: operation_movement_status_types;
  isOutFromSale: boolean;
  accountable: boolean;
  businessId: number;
  productId: number;
  transformedToId: number;
  areaId: number;
  movedToId: number;
  movedById: number;
  approvedById: number;
  supplierId: number;
  createdAt: Date;
  updatedAt: Date;
  movedBy: {
    username: string;
    email: string;
    displayName: string;
  };
  product: {
    name: string;
    measure: string;
  };
  approvedBy: {
    username: string;
    email: string;
    displayName: string;
  };
  supplier: null;
  movedTo: null;
  price: Price;
}

export interface SimplePrice {
  id: number;
  price: number;
  codeCurrency: string;
  paymentWay?: payments_ways;
}

export interface Price {
  id: number;
  amount: number;
  codeCurrency: string;
  paymentWay?: payments_ways;
}

export interface ProductPrice extends SimplePrice {
  isMain: boolean;
  priceSystemId: number;
}

export interface Addon {
  outStock: boolean;
  id: number;
  name: string;
  salesCode: string;
  description: string;
  prices: Array<ProductPrice>;
  outSale: boolean;
  onSale: boolean;
  onSalePrice: Price;
}

export interface SalesCategory {
  id: number;
  name: string;
  description: string;
  image: Image;
  products: number;
}

export interface ProductCategory {
  id: number;
  name: string;
  description: string;
  image: Image;
}

export interface Order {
  id: number | string;
  name: string;
  status: order_receipt_status;
  taxes: Price;
  tipPrice: Price;
  operationNumber: number;
  discount: number;
  observations: string;
  numberClients: number;
  closedDate: Date;
  isForTakeAway: boolean;
  lastProductionNumber: number;
  listResources: string;
  businessId: number;
  salesBy: {
    id: number;
    displayName: string;
    avatar: Image;
  };
  managedBy: {
    id: number;
    displayName: string;
    avatar: Image;
  };
  createdAt: Date;
  selledProducts: Array<SelledProduct>;
  areaSales: {
    id: number;
    name: string;
  };
  showAlertCompleted?: boolean;
  prices: Array<SimplePrice>;
  currenciesPayment: Array<{
    amount: number;
    codeCurrency: string;
    paymentWay: payments_ways;
  }>;
  client: Client;
  shippingPrice: Price;
  shippingBy: Person;
  amountReturned: Price;
  houseCosted: boolean;
}

export interface Client {
  id: number;
  name: string;
  firstName: string
  lastName: string
  observations: string;
  ci: string;
  barCode: string;
  contractNumber: string;
  codeClient: number;
  address: Address;
  phones: Array<Phone>;
  email: string;
}

export interface Person {
  id: number;
  name: string;
}

export interface Address {
  id: number;
  street: string;
  description: string;
  locality: string;
  shippingRegion: ShippingRegion;
  shippingRegionId: number;
}

export interface ShippingRegion {
  id: number;
  name: string;
  price: Price;
}

export interface Phone {
  id: number;
  number: string;
  description: string;
}

export interface SelledProduct {
  id: number | string;
  name: string;
  quantity: number;
  removedQuantity: number;
  restoredQuantity: number;
  productionNumber: number;
  priceTotal: Price;
  priceUnitary: Price;
  status: selled_products_status;
  observations: string;
  areaId: number;
  orderReceiptId: number;
  productId: number;
  addons: AddonInterface[];
  image: Image;
  createdAt: Date;
  updatedAt: Date;
  //type: productType;
  productionTicketId: number;
  productionTicket?: ProductionTicket;
  listProductionAreas?: Array<Area>;
  productionAreaId?: number;
}

export interface Reservation {
  id: number;
  name: string;
  measure: string;
  quantity: number;
  status: string;
  observations: string | null;
  type: string;
  totalCost: number;
  modifiedPrice: boolean;
  colorCategory: string | null;
  isReservation: boolean;
  numberReservation: number | null;
  startDateAt: string;
  endDateAt: string;
  numberAdults: number;
  numberKids: number;
  areaId: number | null;
  productionAreaId: number | null;
  orderReceiptId: number;
  supplierId: number | null;
  productionTicketId: number | null;
  productId: number;
  resourceId: number | null;
  economicCycleId: number | null;
  imageId: number | null;
  variationId: number | null;
  priceTotalId: number;
  priceUnitaryId: number;
  createdAt: string;
  updatedAt: string;
  resource: Resource
  priceTotal: Price
  notes: string
  priceUnitary: Price
  records: ReservationRecord[];
  image:Image
  product:Product
  orderReceipt: {
    id: number;
    status: string;
    statusPay: string;
    origin: string;
    discount: number;
    commission: number;
    operationNumber: number;
    preOperationNumber: number;
    reservationNumber: number;
    isPreReceipt: boolean;
    areaSalesId: number | string
    client: Client
  };
}

interface ReservationRecord {
  id: number;
  action: reservation_actions;
  title: string;
  details: string | null;
  observations: string | null;
  selledProductId: number;
  status: "BILLED"| "CANCELLED" | "CREATED"| "REFUNDED"| "PAYMENT_PENDING"| "REFUNDED",
  statusPay:order_receipt_pay,
  madeById: number;
  madeBy: User;
  createdAt: string;
  updatedAt: string;
}
export type order_receipt_pay = "PAYMENT_PENDING" | "PAID" | "PARTIAL_PAYMENT" | "CANCELLED" | "OVERDUE"
type reservation_actions =
  | "RESERVATION_CREATED"
  | "RESERVATION_EDITED"
  | "RESERVATION_CANCELLED"
  | "RESERVATION_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "RESERVATION_COMPLETED"
  | "RESERVATION_REFUNDED";
// Agrega más acciones según sea necesario

export interface Resource {
  id: number;
  code: string;
  numberClients: number;
  numberAdults: number
  numberKids: number
  description: string
  isAvailable: boolean;
  isReservable: boolean;
  type: 'TABLE';
  areaId: number;
  area: {
    name: string;
  };
}

export interface AddonInterface {
  name: string;
  productId: number;
  quantity: number;
  unityPrice: number;
}

export interface ProductionTicket {
  id: number;
  status: 'RECEIVED' | 'IN_PROCESS' | 'DISPATCHED';
  name: string;
  productionNumber: number;
  areaId: number;
  orderReceiptId: number;
  createdAt: Date;
  updatedAt: Date;
  selledProducts: Array<SelledProduct>;
  orderReceipt: Order;

  //ViaSockets
  hasChange?: boolean;
  textChange?: string;
}

export interface EconomicCycle {
  id: number;
  name: string;
  observations: string;
  openDate: string;
  closedDate: string;
  openBy: UserReduced;
  closedBy: UserReduced;
  priceSystem: PriceSystem;
  isActive: boolean;
}

export interface PriceSystem {
  id: number;
  name: string;
  isMain: boolean;
}

export interface IpvProduct {
  productId: number;
  name: string;
  image: string;
  measure: string;
  productCategory: string;
  productCategoryId: number;
  inStock: number;
  initial: number;
  entry: number;
  movements: number;
  outs: number;
  sales: number;
  processed: number;
  waste: number;
}

export interface IpvData {
  products: Array<IpvProduct>;
  nextAction: 'OPEN' | 'CLOSED' | 'VIEW';
  economicCycleId: number;
  openAction?: {
    madeAt: Date;
    madeBy: string;
  };
  closedAction?: {
    madeAt: Date;
    madeBy: string;
  };
}

export interface ReportEconomicCycle {
  totalSales: Array<{ amount: number; codeCurrency: string }>;
  taxes: Array<{ amount: number; codeCurrency: string }>;
  totalTips: Array<{ amount: number; codeCurrency: string }>;
  totalCashOperations: Array<{
    amount: number;
    codeCurrency: string;
    operation: cash_register_operations;
    type: accountOperationType;
  }>;
  totalDiscounts: Array<{ amount: number; codeCurrency: string }>;
  totalShipping: Array<{ amount: number; codeCurrency: string }>;
  totalTipsMainCurrency: { amount: number; codeCurrency: string };
  totalInCash: Array<{ amount: number; codeCurrency: string }>;
  totalInCashAfterOperations: Array<{ amount: number; codeCurrency: string }>;
  totalSalary: { amount: number; codeCurrency: string };
  totalIncomesNotInCash: Array<{
    amount: number;
    codeCurrency: string;
    paymentWay: string;
  }>;
  totalHouseCosted: Array<{ amount: number; codeCurrency: string }>;
}

export interface ConfigUpdate {
  key: string;
  value: string;
}

export interface SendConfigUpdate {
  configs: ConfigUpdate[];
}

export interface Sequence {
  id: number;
  name: string;
  code: string;
  meta: string | null;
  isActive: boolean;
  description: string | null;
}

export interface Tv {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  isActive: boolean;
  orientation: number;
  businessId: number;
  uniqueCode:string
  sequence: Sequence;
  pages: Page[];
}

export interface Page {
  id: number;
  order: number | null;
  meta: any | null;
  product: any | null;
  template: Template;
}

export interface Template {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  structure: string;
  orientation: string | null;
  description: string | null;
}




