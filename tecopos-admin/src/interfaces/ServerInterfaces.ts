import { Area, CashRegisterOperation } from "./Interfaces";

export interface SalesCategoriesNomenclator {
  id: number;
  name: string;
  image: string | null;
}

interface AccountAndAccountTag {
  id: number;
  name: string;
  code: string | null;
}

export interface AreasInterface {
  id: number;
  name: string;
  productionMode: string;
  code: string | null;
  description: string;
  type: string;
  isActive: boolean;
  isMainStock: boolean;
  salaryFixed: number;
  enableSalaryByPercent: boolean;
  salaryPercent: number;
  enablePercentAfter: number;
  createAccessPointTicket: boolean;
  allowDirectlyMovements: boolean;
  productionOrderController: boolean;
  transferFoundsAfterClose: boolean;
  allowProductsMultiprice: boolean;
  enforceCurrency: boolean;
  allowManualPrice: boolean;
  accountId: number;
  accountTagId: number;
  account: AccountAndAccountTag;
  accountTag: AccountAndAccountTag;
  saleByCategory: boolean;
  saleOnlyMyStock: boolean;
  stockAreaId: number | null;
  salesCategories: SalesCategoriesNomenclator[];
  images: string[];
  stockArea: BasicNomenclator;
  defaultPaymentMethod: string;
  defaultPaymentCurrency: string;
  // availableCodeCurrency: DuplicatorDataToSendInterface;
  availableCodeCurrency: string;
  business?: { name: string };
  giveChangeWith: boolean;
  fixedDiscount: number;
  fixedCommission: number;
  modifiers: Modifier[];
}

export interface MeasuresNomenclator {
  code: string;
  value: string;
}

export type RoleCode =
  | "OWNER"
  | "GROUP_OWNER"
  | "ADMIN"
  | "MANAGER_SALES"
  | "MANAGER_SHIFT"
  | "MANAGER_BILLING"
  | "MANAGER_ECONOMIC_CYCLE"
  | "MANAGER_AREA"
  | "MANAGER_PRODUCTION"
  | "CHIEF_PRODUCTION"
  | "MANAGER_COST_PRICES"
  | "MANAGER_CONTABILITY"
  | "MANAGER_CUSTOMERS"
  | "MANAGER_SUPPLIERS"
  | "PRODUCT_PROCESATOR"
  | "MANAGER_HUMAN_RESOURCES"
  | "MANAGER_SALARY_RULES"
  | "MANAGER_ACCESS_POINT"
  | "MANAGER_SHOP_ONLINE"
  | "MANAGER_SHIPPING"
  | "MANAGER_CURRENCIES"
  | "MANAGER_CONFIGURATIONS"
  | "ANALYSIS_REPORT"
  | "MARKETING_SALES"
  | "MANAGER_TV"
  | "BUYER";

export interface RolesInterface {
  id: number;
  name: string;
  code: RoleCode;
  description: string | null;
}

export interface BasicNomenclator {
  id: number | string;
  name: string;
  description?: string;
}

export interface AvatarInterface {
  id: number;
  src: string;
  thumbnail: string;
}

export interface UserInterface {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  isLogued: boolean;
  lastLogin: string | null;
  displayName: string;
  businessId: number;
  avatarId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  avatar: ImageInterface;
  roles: RolesInterface[];
  allowedStockAreas: Array<BasicNomenclator>;
  allowedSalesAreas: Array<BasicNomenclator>;
  allowedManufacturerAreas: Array<BasicNomenclator>;
  allowedAccessPointAreas: Array<BasicNomenclator>;
}

export interface LastIncomesInterface {
  day: string;
  number: number;
  month: string;
  date: string;
  listEconomicCyclesId: number[];
  totalIncomes: number;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  costCurrency: string;
  mainCodeCurrency: string;
}

export interface ImageInterface {
  id: number;
  src: string;
  thumbnail: string;
  blurHash: string;
}

export interface PriceInterface {
  id?: number;
  codeCurrency: string;
  price: number;

}

export interface MostSelledInterface {
  amountRemain: number;
  averageCost: number;
  images: ImageInterface[];
  name: string;
  prices: PriceInterface[];
  totalSale: number;
  type: string;
  stockLimit: boolean;
}

export interface AddressInterface {
  street: string;
  description: string;
  locality: string;
  municipality: MunicipalityNomenclator;
  province: MunicipalityNomenclator;
  country: LocationNomenclator;
  id: number;
  shippingRegionId: 2;
  updatedAt: string;
  createdAt: string;
  postalCode: string | null;
  coordinateLatitude: string | null;
  coordinateLongitude: string | null;
  municipalityId: number | null;
  provinceId: number | null;
  deletedAt: string | null;
}

export interface KeyNomenclator {
  key: string;
  value: string;
}

export interface BusinessInterface {
  id: number;
  name: string;
  promotionalText: string;
  description: string;
  email: string;
  color: string;
  slug: string;
  dni: string;
  includeShop: boolean;
  enable_pick_up_in_store: boolean;
  subscriptionPlanId: number;
  businessCategoryId: number;
  phones: Array<PhonesInterface>;
  businessCategory: BusinessCategoryInterface;
  images: Array<ImageInterface>;
  socialNetworks: Array<SocialNetworksInterface>;
  logo: ImageInterface | null;
  logoTicket: ImageInterface | null;
  banner: ImageInterface;
  availableCurrencies: Array<CurrencyInterface>;
  address: OnlineAddressInterface;
  subscriptionPlan: SubsPlanInterface;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  type: string | null;
  licenceUntil: string | null;
  costCurrency: string | null;
  mainCurrency: string;
  priceSystems: PriceSystem[];
  configurationsKey: KeyNomenclator[];
  mode: string;
  openHours: string;
  footerTicket: string;
  indexSinTerceros: boolean;
  enableManagementOrders: any;
}

export interface SocialNetworksInterface {
  user: string;
  url: string;
  type: string;
}

export interface ReservationPolicy {
  id: number;
  name: string;
  type: string;
  frequency: string;
  quantity: number;
  discount: number;
  description: string;
  isActive: boolean;
  businessId: number;
  updatedAt: string;
  createdAt: string;
}

export interface CurrencyInterface {
  id: number;
  exchangeRate: number;
  oficialExchangeRate: number;
  isMain: boolean;
  name: string;
  code: string;
  symbol: string;
  isActive: boolean;
  precissionAfterComma: number;
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
}

export interface PhonesInterface {
  number: string;
  description: string | null;
  isMain: boolean;
  isAvailable: boolean;
  id: number;
  updatedAt: string;
  createdAt: string;
  deletedAt: string;
}

export interface SubsPlanInterface {
  id: 5;
  name: string;
  code: string;
  description: string | null;
  price: number | null;
}

export interface ReportsInterface {
  areas: {
    STOCK: number;
    MANUFACTURER: number;
    SALE: number;
  };
  users: {
    total: number;
    actives: number;
  };
  products: {
    total: number;
    totalInSale: number;
  };
}

export interface BusinessCategoryInterface {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AllBusinessInterface {
  id: number;
  name: string;
  status: string;
  slug: string;
  isActive: boolean;
  dni: string;
  licenceUntil: string;
  type: string;
  businessCategory: {
    id: number;
    name: string;
    description: string | null;
  };
  logo: ImageInterface | null;
  subscriptionPlan: SubsPlanInterface;
}

export interface NewBusinessFields {
  dni: string;
  name: string;
  slug: string;
  type: string | null;
  businessCategoryId: number | null;
  subscriptionPlanId: number | null;
}

export interface SysUserInterface {
  id: string;
  displayName: string | null;
  username: string;
  email: string;
  avatar: ImageInterface | null;
}

export interface PriceInvoiceInterface {
  amount: number;
  codeCurrency: string;
  paymentWay?: string;
}

export interface GenericPriceInterface{
  amount?:number,
  price?:number,
  codeCurrency:string
}

export interface TotalOrderModifiersInterface {
  modifierId: number | null;
  modifierName: string;
  prices: PriceInvoiceInterface[];
}

export interface CouponResultInterface {
  couponDiscount: PriceInvoiceInterface[];
  listCoupons: number[];
  freeShipping: boolean;
  client: ClientInterface;
}

export interface InvoiceInterface {
  id: number;
  invoiceNumber: string;
  status: string;
  observations: string;
  nextPayment: string;
  createdAt: string;
  price: PriceInvoiceInterface | null;
  subscriptionPlan: SubsPlanInterface;
  registeredBy: SysUserInterface;
  promotion: boolean;
  dateUntil: string | null;
  discount: number | null;
}

export interface IncomeInterface {
  day: string;
  number: number;
  date: string;
  listEconomicCyclesId: string[];
  totalIncome: number;
}

export interface TotalSubscripion {
  code: string;
  amount: number;
}

export interface TotalType {
  type: string;
  amount: number;
}

export interface SumaryInterface {
  totalRegisteredBusiness: number;
  totalBySubscriptionPlan: TotalSubscripion[];
  totalByType: TotalType[];
}

export interface StockVariationInterface {
  id: number;
  quantity: number;
  variationId: number;
  variation: VariationsInterface;
}

export interface StockAreaProducts {
  id: number;
  quantity: number;
  product: ProductInterface;
  variations: StockVariationInterface[];
  area: BasicNomenclator;
}

export interface SuppliesInterface {
  id: number;
  quantity: number;
  supply: {
    id: number;
    name: string;
    averageCost: number;
    measure: string;
    type: string;
  };
}

export interface CompositionsInterface {
  id: number;
  quantity: number;
  composed: {
    id: number;
    name: string;
    averageCost: number;
    measure: string;
    type: string;
  };
  variation: { id: number; name: string; quantity: number };
}

export interface AttributeInterface {
  id: number;
  name: string;
  code: string;
}

export interface ProductAttributeVariationInterface {
  id: number;
  name: string;
  code: string;
  value: string;
}

export interface ServerRespAttribute {
  id: number;
  code: string;
  name: string;
  value: string;
}

export interface ProductAttributesInterface {
  attributeId?: number;
  code: string;
  name: string;
  values: {
    id: number;
    value: string;
  }[];
}

export interface Options {
  id: number;
  name: string;
  code: string;
  value: string;
}

export interface AttributeTableInterface {
  id?: number;
  active?: boolean;
  name: string;
  code: string;
  options_value: Options[];
  options: string[];
}

export interface AttributeVariationsInterfaces {
  name: string;
  code: string;
  value: string;
}

export interface VariationsInterface {
  id: number;
  name: string;
  description: string;
  onSale: boolean;
  price: PriceInvoiceInterface | null;
  onSalePrice: PriceInvoiceInterface | null;
  image: ImageInterface[];
  attributes: AttributeVariationsInterfaces[];
}

export interface ValuesRadio {
  label: string;
  value: string;
}

export interface RadioOptions {
  label: string;
  name: string;
  values: ValuesRadio[];
  value_default?: string;
}

export interface Manufacturations {
  id: number;
  name: string;
  description: string;
  measure: string;
  images: ImageInterface[];
}

export interface FixedCost {
  id: number;
  costAmount: number;
  description: string;
}

export interface ProductInterface {
  supplierId: number;
  isInternetVisible: any;
  id: number;
  name: string;
  salesCode: string;
  description: string;
  promotionalText: string | null;
  performance: number;
  type: string;
  showForSale: boolean;
  stockLimit: boolean;
  showWhenOutStock: boolean;
  showRemainQuantities: boolean;
  visibleOnline: boolean;
  qrCode: string | null;
  totalQuantity: number;
  measure: string;
  suggested: boolean;
  onSale: boolean;
  alertLimit: number | null;
  isPublicVisible: boolean;
  hasDuration: boolean;
  averagePreparationTime: null;
  elaborationSteps: null;
  averageCost: number;
  duration: string;
  color: string;
  businessId: number;
  productCategory: BasicNomenclator;
  salesCategory: BasicNomenclator;
  onSalePrice: PriceInvoiceInterface;
  images: ImageInterface[];
  prices: PricesInterface[];
  availableAddons: [];
  listManufacturations: Manufacturations[];
  listProductionAreas: BasicNomenclator[];
  stockAreaProducts: StockAreaProducts[];
  supplies: SuppliesInterface[];
  compositions: CompositionsInterface[];
  attributes?: ServerAttributeInterface[];
  variations: ServerVariationInterface[];
  fixedCosts: FixedCost[];
  supplier: { id: number; name: string };
  externalId: number;
  newArrival: boolean;
  newArrivalAt: string;
  stockVariations?: StockVariationInterface[];
  stockQuantity?: number;
  saleByWeight: boolean | null;
  enableDepreciation: boolean;
  monthlyDepreciationRate: number;
  recipe: RecipeInterface | null;
  isWholesale: boolean;
  minimunWholesaleAmount: number | null;
  enableGroup: boolean;
  groupConvertion: number;
  groupName: string;
  onSaleType: "fixed" | "percent";
  onSaleDiscountAmount: number;
  barCode: string;
  resources: Resource[];
  reservationPolicies: ReservationPolicy[];
  availableForReservation: boolean;
  alwaysAvailableForReservation: boolean;
  reservationAvailableFrom: string;
  reservationAvailableTo: string;
}

export interface ServerVariationInterface {
  id: number;
  name: string;
  description: string;
  onSale: boolean;
  price: PriceInvoiceInterface;
  onSalePrice: PriceInvoiceInterface;
  image: ImageInterface;
}

export interface ServerAttributeInterface {
  id: number;
  name: string;
  code: string;
  value: string;
}

export interface ProductCategoriesInterface {
  id: number;
  name: string;
  description: string | null;
  image: ImageInterface | null;
}

export interface PaginateInterface {
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface AreaNomenclator {
  id: number;
  name: string;
  code: string;
}

export interface Price {
  id: number;
  amount: number;
  codeCurrency: string;
  paymentWay?: null;
}

export interface Movement {
  id: number;
  quantity: number;
  costBeforeOperation: number;
  parentId: number;
  parent: Movement;
  childs: Array<Movement>;
  operation: string;
  description: string;
  area: BasicNomenclator;
  status: boolean; //verificar
  isOutFromSale: boolean;
  accountable: boolean;
  businessId: number;
  productId: number;
  transformedToId: number;
  areaId: number;
  movedTo: {
    id: number;
    name: string;
  };
  movedToId: number;
  movedById: number;
  approvedById: number;
  supplierId: number;
  createdAt: Date;
  updatedAt: Date;
  removedOperationId: number;
  removedOperation: {
    id: number;
    movedBy: { id: number; displayName: string };
    createdAt: string;
    description: string;
  };
  movedBy: {
    username: string;
    email: string;
    displayName: string;
    avatar?: {
      id: number;
      src: string;
      thumbnail: string;
      blurHash?: string;
    };
  };
  product: {
    id: number;
    name: string;
    measure: string;
    images: ImageInterface[];
  };
  approvedBy: {
    username: string;
    email: string;
    displayName: string;
  };
  supplier: null;
  price: Price;
  variationId: number | null;
  variation: { id: number; name: string } | null;
}

export interface Resource {
  id: number;
  name: string;
  description: string;
  isAvailable: boolean;
  isReservable: boolean;
}
export interface UserReduced {
  id: number;
  username: string;
  email: string;
  avatar: ImageInterface;
  displayName: string;
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
  meta: null | string;
}

export interface AreaSalesInterface {
  id: number;
  name: string;
}

export interface FundDestinationInterface {
  id: number;
  codeCurrency: string;
  paymentWay: string;
  default: boolean;
  area: {
    id: string;
    name: string;
    code: string;
  };
  account: {
    id: string;
    name: string;
    code: string;
  };
  accountTag: {
    id: string;
    name: string;
    code: string;
  };
}

export interface CurrenciesPaymentInterface {
  amount: number;
  id: number;
  codeCurrency: string;
  paymentWay: string;
  observations: string;
  cashRegisterOperations: CashRegisterOperation[];
  createdAt: string;
}

export interface ManagedByInterface {
  id: number;
  username: string;
  displayName: string;
  avatar: AvatarInterface;
}

export interface PricesInterface {
  codeCurrency: string;
  id: number;
  price: number;
  isMain: boolean;
  priceSystemId: number;
  updatedAt: string;
}

export interface AddonInterface {
  status: string;
  name: string;
  productId: number;
  quantity: number;
  unityPrice: number;
  priceUnitary: PriceInvoiceInterface;
}

export interface SelledProductsInterface {
  addons: AddonInterface[];
  areaId: string;
  createdAt: string;
  id: number;
  image: ImageInterface;
  name: string;
  observations: string;
  priceTotal: PriceInvoiceInterface;
  priceUnitary: PriceInvoiceInterface;
  productId: number;
  productionAreaId: number | null;
  productionTicketId: number;
  quantity: number;
  status: string;
  type: string;
  updatedAt: string;
  variationId: number | null;
  totalCost: number;
  modifiedPrice: boolean;
  variation: ServerVariationInterface | null;
  measure: string;
}

export interface PriceSystem {
  id: number;
  name: string;
  isMain: boolean;
}

export interface DispatchProductNomenclator {
  id: number;
  name: string;
  quantity: number;
  universalCode: number;
  price: number | null;
  cost: PriceInvoiceInterface;
  available?: number;
  image?: string;
  stockAreaProductId: number;
  measure: string;
  mode: string;
}

export interface StockAreaNomenclator {
  id: number;
  name: string;
  code: null;
  business: BasicNomenclator;
}

export interface DispatchProduct {
  cost: PriceInvoiceInterface;
  measure: string;
  name: string;
  price: PriceInvoiceInterface;
  productId: number;
  quantity: number;
  universalCode: number;
  variation: { id: number; name: string } | null;
  product: {
    enableGroup: null | boolean;
    groupConvertion: number | null;
    groupName: null | string;
    id: number;
    name: string;
  };
}

export interface DispatchItemInterface {
  id: number;
  mode: string;
  status: DispatchStatus;
  products: DispatchProduct[];
  stockAreaFromId?: number | null;
  stockAreaToId: number | null;
  observations?: string;
  createdAt: string;
  stockAreaFrom?: StockAreaNomenclator | null;
  stockAreaTo: StockAreaNomenclator;
  createdBy: SysUserInterface | null;
  receivedBy: SysUserInterface | null;
  receivedAt: string;
  rejectedBy: SysUserInterface | null;
  rejectedAt: string;
}

export type DispatchStatus = "ACCEPTED" | "REJECTED" | "CREATED" | "BILLED";
export type ReceiptStatus =
  | "CREATED"
  | "DISPATCHED"
  | "CONFIRMED"
  | "CANCELLED";

export interface MovementProductsInterface {
  productId: number;
  price: PriceInvoiceInterface;
  quantity: number;
  supplierId: number | null;
}

export interface TransformationProduct {
  baseProductId: number;
  quantityBaseProduct: number;
  transformedProductId: number;
  quantityTransformedProduct: number;
  unitaryFractionCost: number;
}

export interface ProductReduced {
  productId: number;
  name: string;
  measure: string;
  quantity: number;
  goalQuantity: number;
  realProduced: number;
  image: string | null;
  averageCost: number;
}

export interface ProductionOrder {
  id: number;
  name: string | null;
  orderProductionId?: number; //For duplicated orders
  status: string;
  observations: string;
  createdAt: string;
  closedDate: string;
  openDate: string;
  totalGoalQuantity: number | null;
  totalProduced: number | null;
  createdBy: UserReduced;
  businessId: number;
  totalCost: number;
  plannedCost: number | null;
  area: { id: number; name: string };
}

export interface ProductionOrderState {
  productionOrder: ProductionOrder;
  rawMateriales: ProductReduced[];
  endProducts: ProductReduced[];
  fixedCosts: FixedCost[];
}

export interface NewOrderInterface {
  state?: string;
  products: { productId: number; quantity: number }[];
  openDate: string;
  observations: string;
}

export interface ProductsRawRecipeInterface {
  id: number;
  quantity: number;
  consumptionIndex: number;
  product: {
    id: number;
    name: string;
    measure: string;
    averageCost: number;
  };
}

export interface RecipeInterface {
  id: number;
  name: string;
  measure: string | null;
  unityToBeProduced: number | null;
  totalCost: number;
  unityToBeProducedCost: number;
  productsRawRecipe: ProductsRawRecipeInterface[];
  products: { id: number; name: string }[];
  realPerformance: number | null;
}

export interface BranchInterface {
  id: 6;
  name: "Asian foods";
  logo: ImageInterface;
  isMain?: boolean;
}

export interface AreaResourcesInterface {
  id: number;
  code: string;
  numberClients: number | null;
  isAvailable: boolean;
  isReservable: boolean;
  type: string;
  area: {
    name: string;
  };
}

export interface EcoCycleNomenclator {
  id: number;
  openDate: string;
}

export interface ProductSalesReport {
  areaId: number;
  id: number;
  modifiedPrice: boolean;
  name: string;
  orderReceipt: {
    name: string;
    createdAt: string;
    operationNumber: number;
    houseCosted: boolean;
    paidAt: string;
    status: string;
    client: ClientInterface;
  };
  priceTotal: { amount: number; codeCurrency: string };
  priceUnitary: { amount: number; codeCurrency: string };
  productId: number;
  quantity: number;
  totalCost: number;
  variation: VariationsInterface;
  variationId: number;
}

// export interface ProductSalesReport {
//   area: AreaNomenclator;
//   economicCycle: EcoCycleNomenclator;
//   isActive: boolean;
//   productId: number;
//   quantity: number;
// }

export interface SalesCategories {
  id: number;
  name: string;
  description: string;
  isActive: true;
  index: number;
  createdAt: string;
  image: ImageInterface;
  visibleOnline: boolean;
}

export interface SelledProducts {
  totalSales: PriceInvoiceInterface[];
  quantitySales: number;
  productId: number;
  name: string;
  salesCategoryId: number;
  salesCategory: string;
  areaSalesId: number;
  areaSales: string;
  totalCost: PriceInvoiceInterface;
  totalSalesMainCurrency: PriceInvoiceInterface;
  enableGroup: boolean;
  groupConvertion: number;
  groupName: string;
  totalQuantity: number;
}

export interface EcoCycleReport {
  id: number;
  name: string;
  observations: null;
  openDate: string;
  closedDate: string;
  isActive: boolean;
  status: string;
  businessId: number;
  openById: number;
  closedById: number;
  priceSystemId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
}

export interface SelledReport {
  products: SelledProducts[];
  economicCycle: EcoCycleReport[];
}

export interface salesOrders {
  summarize: {
    totalSales: [];
    totalSalesInMainCurrency: {
      amount: number;
      codeCurrency: string;
    };
    totalTips: [];
    totalTipsMainCurrency: {
      amount: number;
      codeCurrency: string;
    };
    taxes: [];
    totalDiscounts: [];
    totalCommissions: [];
    totalCouponsDiscounts: [];
    totalShipping: [];
    totalHouseCosted: [];
    totalIncomes: [];
    totalIncomesInMainCurrency: {
      amount: number;
      codeCurrency: string;
    };
    totalIncomesNotInCash: [];
    totalIncomesInCash: [];
    totalCost: {
      amount: number;
      codeCurrency: "CUP";
    };
    totalGrossRevenue: {
      amount: number;
      codeCurrency: "CUP";
    };
  };
  orders: [];
}

export interface BillingInterface {
  id: number;
  invoiceNumber: string;
  status: string;
  observations: string;
  nextPayment: string;
  createdAt: string;
  price: PriceInvoiceInterface;
  subscriptionPlan: SubsPlanInterface;
  discount: number;
}
export interface PaymentMethodsInterface {
  id: string;
  name: string;
  code: string;
}

export interface LocationNomenclator {
  id: number;
  name: string;
  code: string;
}

export interface MunicipalityNomenclator {
  id: number;
  name: string;
  code: string;
  province: LocationNomenclator;
}

export interface StockReport {
  total_products_type: number;
  total_cost: SimplePrice;
  total_estimated_sales: SimplePrice;
  total_estimated_profits: {
    amount: number;
    name?: string;
    code?: string;
    province?: LocationNomenclator;
    codeCurrency: string;
  };
}

export interface ClientInterface {
  id: number;
  firstName?: string; //quitar
  lastName?: string; //quitar
  email: string;
  name: string;
  codeClient: number;
  contractNumber: string;
  observations: null;
  businessId: number;
  address: AddressInterface;
  phones: PhonesInterface[];
  updatedAt: string;
  createdAt: string;
  addressId: number;
  deletedAt: string;
  legalNotes: string;
  ci?: number;
}

export interface SupplierInterfaces {
  id: number;
  name: string;
  observations: null;
  businessId: number;
  updatedAt: string;
  createdAt: string;
  addressId: number;
  deletedAt: string;
  imageId: number;
  image: ImageInterface | null;
  address: OnlineAddressInterface;
  phones: PhonesInterface[];
}

//Interface to Bank Account -----------------------------------------------------------

export interface BankAccountInterfaces {
  id: number;
  name: string;
  address: string;
  description: string;
  isActive: boolean;
  isBlocked: boolean;
  isPrivate: boolean;
  createdAt: string;
  owner: SysUserInterface | null;
  actualBalance: Amount[];
  code: string;
  allowMultiCurrency: boolean;
  definedCurrency: string;
  supply: {
    id: number;
    name: string;
    averageCost: number;
    measure: string;
    type: string;
  };
  createdBy: SysUserInterface | null;
  allowedUsers: Array<any>;
}

export interface Amount {
  amount: number;
  codeCurrency: string;
}

export interface BankAccountOperationInterfaces {
  id: number;
  operation: string;
  description: string;
  createdAt: string;
  registeredAt: string;
  madeBy: SysUserInterface | null;
  amount: Amount | null;
  createdBy: SysUserInterface | null;
  accountTag: BankAccountTagInterfaces | null;
  blocked: boolean;
  noTransaction: string | number;
}

export interface BankAccountRecordsInterface {
  accountId: number;
  action: string;
  createdAt: string;
  details: string;
  id: number;
  madeBy: SysUserInterface;
  madeById: number;
  observations: string;
  title: string;
  updatedAt: string;
}

export interface BankAccountTagInterfaces {
  id: number;
  name: string;
  code: string;
}

export interface BalanceBankAccountInterfaces {
  accountId: number;
  accountName: string;
  currencies: Amount[];
  active?: boolean;
}

export interface AccountBalanceReport {
  costCurrency: string;
  result: BalanceBankAccountInterfaces[];
}

export interface FinancialBankAccountInterface {
  tag: string;
  tagId: number;
  active?: boolean;
  debit: SimplePrice[];
  credit: SimplePrice[];
  total: SimplePrice[];
}

export interface Regions {
  id: number;
  name: string;
  description: string;
  businessId: number;
  priceId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  price: PriceInvoiceInterface;
  municipality: LocationNomenclator;
  province: LocationNomenclator;
}

export interface StockInvestmentInterface {
  areaId: number;
  areaName: string;
  total_cost: number;
  total_estimated_sales: number;
  total_estimated_profits: number;
  active?: boolean;
}

export interface StockAviableInterface {
  productId: number;
  universalCode: number;
  productName: string;
  total_disp: number;
  id_category: number;
  salesCategoryName: string;
  disponibility: number;
  measure: string;
  stocks: {
    stockId: number;
    stockName: string;
    quantity: number;
    stockCode: string;
  }[];
  total_cost: number;
  total_estimated_sales: number;
  total_estimated_profits: number;
  active?: boolean;
}

export interface StockAvailableCategoriesInterface {
  productId?: number;
  universalCode?: number;
  productName?: string;
  salesCategoryName: string;
  total_cost: number;
  total_estimated_sales: number;
  total_estimated_profits: number;
  total_disp: number;
  active?: boolean;
  measure?: string;
  stocks?: {
    stockId: number;
    stockName: string;
    quantity: number;
  }[];
}

export interface StockInventoryReport {
  costCurrency: string;
  result: StockInvestmentInterface[];
}

export interface StockAviable {
  costCurrency: string;
  products: StockAviableInterface[];
  categories: StockAvailableCategoriesInterface[];
}

export interface AreasShareBussines {
  id: number;
  name: string;
}

export interface ShareArea {
  id: number;
  createdAt: string;
  area: AreasShareBussines | null;
  sharedBusiness: AreasShareBussines | null;
  sharedBy: SysUserInterface | null;
}

export interface CashOpperationInterface extends PriceInvoiceInterface {
  type: string;
  operation: string;
}

//Economic Cycles Module

export interface AreaSalesIncomes {
  openAt?: string;
  closedAt?: string;
  createdAt?: string;
  totalIncomes: { amount: number; codeCurrency: string }[];
  areaId?: number;
  totalHouseCosted: PriceInvoiceInterface[];
  totalSales: PriceInvoiceInterface[];
  taxes?: PriceInvoiceInterface[];
  totalTips: PriceInvoiceInterface[];
  totalDiscounts: PriceInvoiceInterface[];
  totalShipping: PriceInvoiceInterface[];
  totalInCash: PriceInvoiceInterface[];
  totalInCashAfterOperations: PriceInvoiceInterface[];
  totalIncomesNotInCash: PriceInvoiceInterface[];
  totalIncomesInCash: PriceInvoiceInterface[];
  totalCashOperations: CashOpperationInterface[];
  totalTipsMainCurrency: PriceInvoiceInterface;
  totalSalesInMainCurrency: PriceInvoiceInterface;
  totalSalary: PriceInvoiceInterface;
  totalCost: PriceInvoiceInterface;
  totalGrossRevenue: PriceInvoiceInterface;
  totalCommissions: PriceInvoiceInterface[];
  totalOrderModifiers?: TotalOrderModifiersInterface[];
  totalAsumedCost: PriceInvoiceInterface;
}

export interface FinancialEconomicCycleReporteInterface {
  cashOperations: CashOperationInterface[];
  economicCycle: AreaSalesIncomes;
  exchange_rates: ExchangeRatesInterface[];
  orders: any[];
  pendingOrders: any[];
}

export interface PaymentInterface {
  id: number;
  amount: number;
  codeCurrency: string;
  paymentWay: string;
}

export interface OrderRecordInterface {
  action: string;
  title: string;
  details: string;
  observations: string;
  createdAt: string;
  madeBy: UserInterface;
}

export interface OrderSelledProduct {
  name: string;
  quantity: number;
  status: string;
}

export interface Resource {
  id: number;
  code: string;
  numberClients: number;
  numberAdults: number;
  numberKids: number;
  isAvailable: boolean;
  isReservable: boolean;
  type: "TABLE";
  areaId: number;
  area: {
    name: string;
  };
}

export interface OrderTicket {
  name: string;
  productionNumber: number;
  createdAt: string;
  preparedBy: UserInterface;
  area: AreaNomenclator;
  selledProducts: OrderSelledProduct[];
  status: string;
}

export interface OpperationsRecordsInterface {
  action: string;
  title: string;
  details: string;
  observations: string;
  createdAt: string;
  madeBy: UserInterface;
}

export interface OrderInterface {
  isPreReceipt: boolean;
  deliveryAt?: string;
  id: number;
  externalId: number | null;
  amountReturned: PriceInvoiceInterface;
  areaSales: AreaSalesInterface;
  businessId: number;
  client: ClientInterface;
  closedDate: string;
  createdAt: string;
  currenciesPayment: Array<CurrenciesPaymentInterface>;
  discount: number;
  houseCosted: boolean;
  isForTakeAway: boolean;
  listResources: string;
  managedBy: ManagedByInterface;
  name: string;
  numberClients: number;
  observations: string;
  operationNumber: number;
  prices: Array<PriceInterface>;
  salesBy: {
    id: number;
    username: string;
    displayName: string;
  };
  selledProducts: SelledProductsInterface[];
  shippingBy: { id: number; username: string; displayName: string } | null;
  shippingPrice: PaymentInterface;
  status: string;
  taxes: PaymentInterface;
  tipPrice: PaymentInterface | null;
  totalCost: number;
  updatedAt: string;
  records: OpperationsRecordsInterface[];
  tickets: OrderTicket[];
  modifiedPrice: boolean;
  billing: OnlineBillShippingInterface;
  shipping: OnlineBillShippingInterface;
  shippingById: number | null;
  customerNote: string | null;
  paymentGateway: PaymentGatewayInterface;
  origin: string;
  totalToPay: PriceInvoiceInterface[];
  paidAt: string | null;
  couponDiscountPrice: PriceInvoiceInterface;
  pickUpInStore: boolean;
  economicCycle: { id: number; openDate: string } | null;
  commission: number;
  partialPayments: CurrenciesPaymentInterface[];
  partialPayment?: PartialPaymentInterface[];
  cashRegisterOperations: CashRegisterOperation[];
  paymentDeadlineAt?: string;
  meta: null | string;
}

export interface OrderInterfaceV2 {
  id: number;
  name: string;
  status: string;
  discount: number;
  observations: string;
  numberClients: null | number;
  closedDate: string;
  isForTakeAway: boolean;
  createdAt: string;
  updatedAt: string;
  businessId: number;
  operationNumber: number;
  houseCosted: boolean;
  totalCost: number;
  modifiedPrice: boolean;
  customerNote: string | null;
  origin: string;
  paidAt: string;
  pickUpInStore: boolean;
  shippingById: null | number;
  deliveryAt?: string;
  totalToPay: PriceInvoiceInterface[];
}

export interface ExchangeRatesInterface {
  code: string;
  exchangeRate: number;
  id: number;
  isActive: boolean;
  isMain: boolean;
  name: string;
  symbol: string;
}

export interface PartialPaymentInterface {
  id: number;
  paymentNumber: number;
  amount: number;
  codeCurrency: string;
  paymentWay: string;
  observations: string;
  orderReceiptId: number;
  cashRegisterOperations: CashRegisterOperation[];
  createdAt: string;
  updatedAt: string;
}

export interface RegisterBillingInterface extends OrderInterface {
  sendMail?: boolean;
  paymentDeadlineAt?: string;
  registeredAt?: string;
  isPreReceipt: boolean;
  partialPayment?: PartialPaymentInterface[];
  areaId?: any;
}

export interface OnlineAddressInterface {
  street_1: string;
  street_2: string;
  description: string;
  city: string;
  postalCode: string;
  municipality: { id: number; name: string; code: string };
  province: { id: number; name: string; code: string };
  country: { id: number; name: string; code: string };
}

export interface OnlineBillShippingInterface extends OnlineAddressInterface {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
}

export interface OnlineClientInterface {
  id: number;
  firstName: string;
  lastName: string;
  barCode?: string;
  ci?: string;
  codeClient: number;
  contractNumber: number;
  email: string;
  sex: string;
  registrationWay: string;
  birthAt: string;
  observations: string;
  externalId: number;
  address: OnlineAddressInterface;
  phones: PhonesInterface[];
  createdAt: string;
  usedCoupons: Array<CouponInterface>;
  legalNotes: string;
  customerCategory: CustomerCategory;
}

interface CustomerCategory {
  id: number;
  name: string;
  description: string;
}

export interface ProductDependencies {
  id: number;
  name: string;
  measure: string;
  images: ImageInterface[];
  quantity: number;
  type: string;
}

export interface PaymentGatewayInterface {
  id: number;
  externalId: string;
  name: string;
  description: string;
  isActive: boolean;
  paymentWay: string;
}

export interface StockInventoryProducts {
  stockProductId: number;
  productId: number;
  name: string;
  image: string;
  measure: string;
  productCategory: string;
  productCategoryId: number;
  inStock: number;
  entry: number;
  initial: number;
  movements: number;
  outs: number;
  sales: number;
  onlineSales: number;
  processed: number;
  waste: number;
  variations: {
    id: number;
    name: string;
    inStock: number;
    initial: number;
    onlineSales: number;
    entry: number;
    movements: number;
    outs: number;
    waste: number;
    sales: number;
    processed: number;
  }[];
}

interface DateAction {
  madeAt: string;
  madeBy: string;
}

export interface ServerStockInventoryInterface {
  products: StockInventoryProducts[];
  openAction: DateAction;
  closedAction: DateAction;
}

// CouponServer
export interface CouponInterface {
  id: number;
  code: string;
  amount: number;
  discountType: string;
  description: string;
  expirationAt: string | null | undefined;
  usageCount: number;
  usageLimit: number;
  usageLimitPerUser: number;
  limitUsageToXItems: number;
  freeShipping: boolean;
  individualUse: boolean;
  excludeOnSaleProducts: boolean;
  minimumAmount: number;
  maximumAmount: number;
  allowedProducts: Array<number>;
  excludedProducts: Array<number>;
  allowedSalesCategories: Array<SalesCategories>;
  excludedSalesCategories: Array<SalesCategories>;
  codeCurrency: string;
}

export interface StockAreaCoupons {
  id: number;
  quantity: number;
  product: CouponInterface;
  variation: string[];
  area: BasicNomenclator;
}

export interface CouponSalesReport {
  area: AreaNomenclator;
  economicCycle: EcoCycleNomenclator;
  isActive: boolean;
  productId: number;
  quantity: number;
}

export interface CouponDependencies {
  id: number;
  name: string;
  measure: string;
  images: ImageInterface[];
  quantity: number;
}

export interface CouponAttributeVariationInterface {
  id: number;
  name: string;
  code: string;
  value: string;
}

export interface CouponAttributeVariationInterface {
  id: number;
  name: string;
  code: string;
  value: string;
}

export interface CouponCategoriesInterface {
  id: number;
  name: string;
  description: string | null;
  image: ImageInterface | null;
}

export interface CustomerSumarizeOrder {
  clientId: number;
  clientName: string;
  prices: PriceInvoiceInterface[];
  shippingPrice: PriceInvoiceInterface[];
  discounts: PriceInvoiceInterface[];
  total: PriceInvoiceInterface[];
}

interface ModifierInterface {
  id: number;
  name: string;
  type: "tax" | "discount";
  amount: number;
  codeCurrency: string;
  index: number;
  active: boolean | null;
  applyToGrossSales: boolean;
  applyAcumulative: boolean;
  applyFixedAmount: boolean;
  showName: string;
  observations?: string | null;
  areaId: number;
  area: {
    id: number;
    name: string;
  };
  fixedPrice?: { amount: number; codeCurrency: string };
}
export interface OrderInterface {
  isPreReceipt: boolean;
  id: number;
  status: string;
  discount: number;
  observations: string;
  createdAt: string;
  operationNumber: number;
  origin: string;
  customerNote: string | null;
  selledProducts: SelledProductsInterface[];
  currenciesPayment: CurrenciesPaymentInterface[];
  prices: PriceInterface[];
  billing: OnlineBillShippingInterface;
  shipping: OnlineBillShippingInterface;
  shippingPrice: PaymentInterface;
  taxes: PaymentInterface;
  orderModifiers: ModifierInterface[];
  coupons: { code: string; amount: number; discountType: string }[];
  preOperationNumber?: number;
}

export interface OrdersManagedByInterface {
  managedBy: ManagedByInterface;
  prices: PriceInterface[];
  totalToPay: Amount[];
  tipPrices: any[];
  amountOfProducts: number;
}

export interface CouponClientInterface {
  address: AddressInterface;
  birthAt: string;
  createdAt: string;
  name: string;
  id: number;
  email: string;
  externalId: number | null;
  firstName: string | null;
  lastName: string | null;
  observations: string | null;
  phones: PhonesInterface[];
  registrationWay: string;
  sex: string | null;
  usedCoupons: Array<CouponInterface>;
}

export interface GeneralAreaIncome extends AreaSalesIncomes {
  totalIncomes: PriceInvoiceInterface[];
  totalIncomesInCash: PriceInvoiceInterface[];
  generalRevenue: PriceInvoiceInterface;
  generalIncomesCurrencies: Partial<CurrenciesPaymentInterface>[];
  generalCostCurrencies: Partial<CurrenciesPaymentInterface>[];
  generalIncomesMainCurrency: Partial<CurrenciesPaymentInterface>;
  generalCostMainCurrency: Partial<CurrenciesPaymentInterface>;
  totalIncomesInCurrencies: Partial<CurrenciesPaymentInterface>[];
  totalIncomesInMainCurrency: Partial<CurrenciesPaymentInterface>;
  // totalIncomes: Partial<CurrenciesPaymentInterface>[];
  bankAccounts: FinancialBankAccountInterface[];
}

export interface PostInterface {
  id: number;
  name: string;
  code: string;
}

export interface PersonCategory {
  id: number;
  name: string;
  code: string;
}

export interface PersonInterface {
  id: number;
  businessId: number;
  firstName: string;
  lastName: string | null;
  sex: string | null;
  birthAt: string;
  address: OnlineAddressInterface;
  phones: PhonesInterface[];
  qrCode: string | null;
  barCode: string | null;
  isInBusiness: boolean;
  isActive: boolean;
  user: {
    id: number;
    displayName: string;
    email: string;
  };
  profilePhoto: ImageInterface | null;
  post: PostInterface;
  personCategory: PersonCategory;
}
export interface ProductRecordsInterface {
  id: number;
  action: string;
  registeredAt: string;
  oldValue: string;
  newValue: string;
  details: string;
  productId: number;
  madeById: number;
  createdAt: string;
  updatedAt: string;
  madeByUser: SysUserInterface;
}

export interface AccessRecordsInterface {
  id: number;
  type: string;
  createdAt: string;
  person: PersonInterface;
  area: {
    id: number;
    name: string;
  };
  registeredBy: { displayName: string; email: string; id: number };
}

export interface PersonRecordsInterface {
  code: string;
  id: number;
  createdAt: string;
  observations: string;
  registeredBy: {
    displayName: string;
    username: string;
    email: string;
  };
  document: {
    id: number;
    path: string;
    src: string;
  };
}

export interface SalaryRuleInterface {
  id: number;
  name: string;
  post: PostInterface | null;
  personCategory: PersonCategory;
  business: {
    id: number;
    name: string;
  };
  modeTips: string;
  divideEquivalentByPost: boolean;
  isFixedSalary: boolean;
  counting: string;
  amountFixedSalary: number;
  referencePercent: number;
  percentAmountToIncrement: number;
  percentAmountToDecrement: number;
  reference: string;
  includeTips: false;
  percentTip: number;
  codeCurrency: string;
  restrictionsByDays: boolean;
  restrictedDays: string;
  includeRechargeInSpecialHours: boolean;
  specialHours: string;
  amountSpecialHours: number;
}
export interface DuplicatorDataToSendInterface {
  registerAt: string;
  economicCycleId: string | undefined;
  salesAreas: DuplicatorInterface[];
}
export interface DuplicatorInterface {
  areasFromId: Array<number>;
  areaToId: number;
  keepSameData: boolean;
  plannedAmount?: number;
  codeCurrency?: string;
  ordersUpTo?: number;
  isFixedTransfers?: boolean;
  includeDeposits?: boolean;
  includeExtractions?: boolean;
  includeTips?: boolean;
  isFixedMarkOrders?: boolean;
  fixedCategories?: Array<number>;
  excluedCategories?: Array<number>;
  excludedProducts?: Array<number>;
  limitOrders?: boolean;
  categories?: boolean;
  excludecategories?: boolean;
  excludeProds?: boolean;
  allowedPaymentCurrencies?: Array<number>;
  selectedOrders?: string | Array<number>;
}

export interface CashOperationInterface {
  id: number;
  amount: number;
  codeCurrency: string;
  observations: string;
  operation: string;
  createdAt: string;
  madeBy: {
    id: number;
    username: string;
    displayName: string;
    avatar: {
      id: number;
      src: string;
      thumbnail: string;
      blurHash: string;
    };
  };
}

export interface SimplePrice {
  amount: number;
  codeCurrency: string;
}

export interface GeneralReportInterface {
  listEconomicCycleData: {
    id: number;
    totalSales: SimplePrice[];
    totalIncomes: SimplePrice[];
    totalTips: SimplePrice[];
    amountPeopleWorked: number;
    totalSalesInMainCurrency: number;
    totalIncomesInMainCurrency: number;
    totalTipsInMainCurrency: number;
  }[];
  transformedMatrix: TransformedMatrixInterface[];
  totalToPay: SimplePrice;
  totalTip: SimplePrice;
}

export interface TransformedMatrixInterface {
  person: {
    id: number;
    firstName: string;
    lastName: string;
    isActive: boolean;
    isInBusiness: boolean;
    observations: null;
    sex: null;
    birthAt: null;
    qrCode: null;
    barCode: string;
    businessId: number;
    addressId: null | number;
    userId: number | null;
    personCategoryId: number | null;
    postId: number | null;
    profilePhotoId: number | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: null;
    post: {
      id: number;
      name: string;
    } | null;
    personCategory: {
      id: number;
      name: string;
    } | null;
  };
  listEconomicCycles: listEconomicCyclesInterface[];

  totalOrdersSalesInPOS: SimplePrice[];
  totalOrdersManaged: SimplePrice[];
  totalOrdersManagedByZone: SimplePrice[];
  totalOrdersServed: SimplePrice[];
  totalProductsProduced: SimplePrice[];
  totalSales: SimplePrice[];
  totalReferenceToPay: SimplePrice[];
  totalReferenceToPayInMainCurrency: SimplePrice;
  tips: SimplePrice;
  amountFixed: SimplePrice;
  specialHours: SimplePrice;
  baseAmount: SimplePrice;
  realToPay: SimplePrice;
  plusAmount: SimplePrice;
}

export interface listEconomicCyclesInterface {
  startsAt: string;
  endsAt: string;
  totalOrdersSalesInPOS: SimplePrice[];
  totalOrdersManaged: SimplePrice[];
  totalOrdersManagedByZone: SimplePrice[];
  totalOrdersServed: SimplePrice[];
  totalProductsProduced: SimplePrice[];
  totalSales: SimplePrice[];
  totalReferenceToPay: SimplePrice[];
  totalReferenceToPayInMainCurrency: SimplePrice;
  tips: SimplePrice;
  amountFixed: SimplePrice;
  specialHours: SimplePrice;
  baseAmount: SimplePrice;
  realToPay: SimplePrice;
  plusAmount: SimplePrice;
  observations: string;
  economicCycleId: number;
  referencePercent: number;
  percentIncreased: number;
  percentDecresed: number;
}

export interface DayAsistanceInterface {
  person: PersonInterface;
  entries: Array<string>;
  exits: Array<string>;
}

export interface AvailableCurrency {
  exchangeRate: number;
  oficialExchangeRate: number;
  precissionAfterComma: number;
  isActive: boolean;
  isMain: boolean;
  code?: string;
  currency: {
    name: string;
    code: string;
    symbol: string;
  };
}

export interface ExtendedNomenclator extends BasicNomenclator {
  action?: (data: number) => void;
  availableOptions: OptionsNomenclator[];
  reset: () => void;
}

export interface OptionsNomenclator {
  name: string;
  id: number;
}

interface Sale {
  amount: number;
  codeCurrency: string;
}

interface Income extends Sale {}

interface Tip extends Sale {}

interface PeopleByPost {
  postId: number;
  amountPeople: number;
  postName: string;
}

export interface EconomicCycleData {
  amountPeopleToIncludeInTips: number | null;
  id: number;
  startsAt: string;
  endsAt: string;
  totalSales: Sale[];
  totalIncomes: Income[];
  totalTips: Tip[];
  amountPeopleWorked: number;
  totalSalesInMainCurrency: number;
  totalIncomesInMainCurrency: number;
  totalTipsInMainCurrency: number;
  peopleByPost: PeopleByPost[];
  businessId: number;
  businessName: string;
}

interface SalaryReportCycle {
  startsAt: string;
  endsAt: string;
  economicCycleId: number;
  totalOrdersManaged: Sale[];
  totalOrdersServed: Sale[];
  referencePercent: number;
  totalSales: Sale[];
  totalReferenceToPay: Sale[];
  percentIncreased: number;
  percentDecresed: number;
  baseAmount: Sale;
  amountFixed: Sale;
  specialHours: Sale;
  plusAmount: Sale;
  tips: Sale;
  realToPay: Sale;
  totalReferenceToPayInMainCurrency: Sale;
  observations: string;
  totalOrdersSalesInPOS: Sale[];
  totalOrdersManagedByZone: any;
  totalProductsProduced: any;
}

interface Person {
  id: number;
  firstName: string;
  lastName: string;
  personCategory:
    | {
        id: number;
        name: string;
      }
    | any;
  post:
    | {
        id: number;
        name: string;
      }
    | any;
  userId: number | null;
  postId: number | null;
  personCategoryId: number | null;
  business: { id: number; name: string };
}

export interface SalaryReportPersons {
  listEconomicCycles: SalaryReportCycle[];
  person: Person;
  id: number;
  baseAmount: number;
  codeCurrency: string;
  specialHours: number;
  plusAmount: number;
  tips: number;
  totalToPay: number;
  otherPays: number;
  accordance: number;
  isPaid: boolean;
  observations: string;
  personId: number;
  personCategoryId: number | null;
  personPostId: number | null;
  salaryReportId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  personalData: string;
}

export interface SalaryReport {
  id: number;
  name: string;
  observations: string;
  generatedBy: {
    avatar: any;
    displayName: string;
    email: string;
    id: number;
    username: string;
  };
  generatedAt: string;
  startsAt: string;
  endsAt: string;
  codeCurrency: string;
  status: string;
  businessId: number;
  totalTips: number;
  totalIncomes: number;
  totalSales: number;
  totalToPay: number;
  economicCycleData: EconomicCycleData[];
  salaryReportPersons: SalaryReportPersons[];
}

export interface HistoricalSalaryInterface {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  items: {
    id: number;
    name: string;
    startsAt: string;
    endsAt: string;
    codeCurrency: string;
    status: string;
  }[];
}

interface Post {
  id: number;
  postName: string;
  quantity: number;
}

interface Category {
  id: number;
  categoriesName: string;
  quantity: number;
}

interface Business {
  id: number;
  businessName: string;
  quantity: number;
}

export interface humanresourceSummaryInterfaceData {
  listPosts: Post[];
  listCategories: Category[];
  listBusiness: Business[];
  males: number;
  females: number;
  notSexDefined: number;
  inBusiness: number;
  totalPeopleInactive: number;
  totalPeopleActive: number;
  totalGeneral: number;
  nextMonthBirthdays: any[]; // You might want to define a more specific type for this array
}
export interface Seller {
  nameSeller: string;
  orderCount: number;
  totalPayInOrden: number;
}

export interface Client {
  nameClient: string;
  totalOrder: number;
  totalPayInOrden: number;
}

export interface Product {
  product: string;
  totalValue: number;
  sales: number;
}

export interface PrepaidsInterface {
  id: number;
  paymentNumber: number;
  paymentNumberClient: number;
  status: "PAID" | "REFUNDED" | "USED";
  amount: number;
  description: string;
  codeCurrency: string;
  paymentWay: string;
  clientId: 110;
  businessId: 1;
  orderReceiptId: number | null;
  createdAt: string;
  updatedAt: string;
  client: ClientInterface;
}

export interface MonthOrder {
  total: number;
  preBills: number;
  bills: number;
  prepaid: number;
  month: string;
}

export interface OrdersByStatus {
  total: number;
  [key: string]: number;
}

export interface SalesByMonthInterface {
  month: string;
  amount: number;
  codeCurrency: string;
}

export interface PrepaidByStatusInterface {
  total: number;
  REFUNED: number;
  USED: number;
  PAID: number;
}

export interface OrdersByCurrencyInterface {
  currency: string;
  total: number;
}
export interface TopsSellersInterface {
  nameSeller: string;
  orderCount: number;
  totalPayInOrden: number;
}

export interface Modifier {
  id: number;
  name: string;
  type: string;
  amount: number;
  active: boolean | null;
  index: number;
  applyToGrossSales: boolean;
  applyAcumulative: boolean;
  applyFixedAmount: boolean;
  showName: string;
  codeCurrency: string;
  observations: string | null;
  area: Area;
  fixedPrice: SimplePrice;
}

export interface OrderSummary {
  topsSellers: TopsSellersInterface[];
  prepaidByStatus: PrepaidByStatusInterface;
  salesByMonthInMainCurrency: SalesByMonthInterface[];
  sellersWithMostOrders: Seller[];
  sellersWithHighestSales: Seller[];
  ordersByClient: Client[];
  topValueProducts: Product[];
  topsProductOrder: Product[];
  ordersByResumeStatusPay: any; // You can define this more specifically if you have the information
  ordersByResumeType: any; // You can define this more specifically if you have the information
  orderByMonth: MonthOrder[];
  orderByStatus: OrdersByStatus;
  ordersBySeller: { [seller: string]: Seller };
  ordersByCurrency: OrdersByCurrencyInterface[];
  totalSales: { amount: number; codeCurrency: string }[];
  totalSalesInMainCurrency: { amount: number; codeCurrency: string };
  totalTips: { amount: number; codeCurrency: string }[];
  totalTipsMainCurrency: { amount: number; codeCurrency: string };
  taxes: any[]; // You can define this more specifically if you have the information
  totalDiscounts: { amount: number; codeCurrency: string }[];
  totalCommissions: { amount: number; codeCurrency: string }[];
  totalCouponsDiscounts: { amount: number; codeCurrency: string }[];
  totalShipping: { amount: number; codeCurrency: string }[];
  totalHouseCosted: { amount: number; codeCurrency: string }[];
  ordersByOrigin: { [origin: string]: number };
  ordersByPaymentWay: { [way: string]: number };
  totalIncomes: { amount: number; codeCurrency: string }[];
  totalIncomesInMainCurrency: { amount: number; codeCurrency: string };
  totalIncomesNotInCash: {
    amount: number;
    codeCurrency: string;
    paymentWay: string;
  }[];
  totalIncomesInCash: { amount: number; codeCurrency: string }[];
  totalCost: { amount: number; codeCurrency: string };
  totalGrossRevenue: { amount: number; codeCurrency: string };
}
export interface OrderDataBillingFormInterface {
  clientId: number;
  name: string;
  salesById: number;
  registeredAt: string;
  paymentDeadlineAt: string;
  customerNote: string;
  areaSalesId: number;
  products: { productId: number; quantity: number }[];
  pickUpInStore: boolean;
  coupons?: string[];
  discount?: number;
  comission?: number;
  shippingPrice?: { amount: number; codeCurrency: string };
  shipping?: OnlineBillShippingInterface;
}

export interface TransformProductPricesInterface {
  mode: string;
  codeCurrency: string;
  percent: number;
  adjustType: string;
  adjustRound: string;
  propagateToAllChilds: boolean;
}

export interface FixedCostCategoriesInterface {
  id: number;
  name: string;
  description: string;
}

export interface BatchInterface {
  id: number;
  businessId: number;
  description: string;
  uniqueCode: string;
  expirationAt: string;
  entryQuantity: number;
  noPackages: number;
  measure: string;
  buyedProducts: {
    status: string;
    quantity: number;
    observations: null;
  }[];
  product: {
    id: number;
    name: string;
    type: string;
  };
  variation: null;
  grossCost: {
    amount: number;
    codeCurrency: string;
  };
  netCost: {
    amount: number;
    codeCurrency: string;
  };
  registeredPrice: {
    amount: number;
    codeCurrency: string;
  };
}

export interface DocumentInterface {
  id: number;
  title: string;
  description: string;
  path: string;
  src: string;
  businessId: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  clientId: number;
}

export interface CostInterface {
  id: number;
  costAmount: number;
  observations: string;
  fixedCostCategory: FixedCostCategoriesInterface;
}

export interface ReceiptBatchInterface {
  id: number;
  observations: string | null;
  status: ReceiptStatus;
  totalCost: number;
  createdAt: string;
  businessId: number;
  batches: BatchInterface[];
  createdBy: UserInterface;
  stockAreaTo: AreasInterface;
  account: BankAccountInterfaces;
  documents: DocumentInterface[];
  costs: {
    id: number;
    costAmount: number;
    fixedCostCategory: FixedCost;
    observations: string;
  }[];
  dispatch: {
    id: number;
    status: DispatchStatus;
    createdAt: string;
    rejectedAt?: string;
    receivedAt?: string;
    stockAreaTo: {
      id: number;
      name: string;
      businessId: number;
      business: {
        id: number;
        name: string;
      };
    };
  };
}

export interface IAddress {
  id: number;
  street_1: string;
  street_2: string;
  description: string;
  city: string;
  postalCode: string;
  municipality: {
    code: string;
    name: string;
  };
  province: {
    code: string;
    name: string;
  };
  country: {
    code: string;
    name: string;
  };
}

export interface ListBalanceInterface {
  id: number;
  listId: number;
  name: string;
  listName: string;
  currencies: Currency[];
}

interface Currency {
  amount: number;
  codeCurrency: string;
}
