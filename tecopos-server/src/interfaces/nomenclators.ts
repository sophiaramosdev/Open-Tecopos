export type productType =
    | "MENU"
    | "STOCK"
    | "COMBO"
    | "SERVICE"
    | "VARIATION"
    | "RAW"
    | "MANUFACTURED"
    | "WASTE"
    | "ASSET"
    | "ADDON";
export type stockAreaProductType = "STOCK" | "VARIATION";
export type billing_status = "PENDING" | "APPROVED" | "REFUNDED" | "CANCELLED";

export type business_status = "CREATED" | "ACTIVE" | "INACTIVE";
export type business_mode = "SIMPLE" | "GROUP";
export type business_types = "RESTAURANT" | "SHOP" | "DATES";

export type role_types = "ADMINISTRATION" | "CONTROL" | "PUBLIC";
export type area_types = "MANUFACTURER" | "STOCK" | "SALE" | "ACCESSPOINT";

export type references_salary =
    | "salesInPos"
    | "manageOrders"
    | "manageOrdersInZone"
    | "totalSales"
    | "serveOrders"
    | "productionOrders";

export type mode_tip = "percent" | "fixed" | "equivalent";
export type counting = "cycles" | "days";

export type production_mode = "SERIAL" | "BYORDERS" | "STATE";
export type access_mode = "PERSON" | "ORDERS";
export type dispatchs_status = "CREATED" | "ACCEPTED" | "REJECTED" | "BILLED";
export type dispatchs_mode = "SALE" | "MOVEMENT";
export type access_point_status = "CREATED" | "ACCEPTED" | "REJECTED";

export type selled_products_status = "RECEIVED" | "IN_PROCESS" | "COMPLETED";

export type order_receipt_actions =
    | "ORDER_CREATED"
    | "ORDER_EDITED"
    | "PRODUCT_ADDED"
    | "PRODUCT_REMOVED"
    | "ORDER_MOVED"
    | "ORDER_REOPEN"
    | "ORDER_CLOSED"
    | "ORDER_CANCELLED"
    | "ORDER_BILLED"
    | "IN_PROCESS"
    | "COMPLETED"
    | "ORDER_SYNCRONIZED"
    | "WITH_ERRORS"
    | "WAITING"
    | "ORDER_REMOVED_BILLED"
    | "ORDER_REFUNDED"
    | "PAYMENT_FAILS"
    | "ORDER_PARTIAL_BILLED"
    | "ADVANCE_PAYMENT_USED"
    | "PAYMENT_REMINDER_SENT"
    | "TRANSFORMED_TO_INVOICE"
    | "PARTIAL_PAYMENT_REMOVED"
    | "RESERVATION_CANCELLED"
    | "RESERVATION_REFUNDED";

export type reservation_actions =
    | "RESERVATION_CREATED"
    | "RESERVATION_EDITED"
    | "RESERVATION_CANCELLED"
    | "RESERVATION_CONFIRMED"
    | "PAYMENT_RECEIVED"
    | "RESERVATION_COMPLETED"
    | "RESERVATION_REFUNDED";

export type account_actions_records =
    | "ACCOUNT_CREATED"
    | "ACCOUNT_EDITED"
    | "ACCOUNT_DELETED"
    | "OPERATION_ADDED"
    | "OPERATION_EDITED"
    | "OPERATION_DELETED"
    | "CURRENCY_EXCHANGE"
    | "ACCOUNT_TRANSFERRED"
    | "ADD_USER_TO_ACCOUNT"
    | "BALANCE_STATUS"
    | "DELETE_USER_TO_ACCOUNT";

export type product_actions_records =
    | "CREATED_PRODUCT"
    | "REMOVED_PRODUCT"
    | "EDIT_GENERAL_DATA_PRODUCT"
    | "CHANGE_PRICE"
    | "ADD_NEW_PRICE"
    | "CREATED_FIXED_COST"
    | "REMOVE_FIXED_COST"
    | "EDIT_FIXED_COST"
    | "EDIT_TECHNICAL_FILE";

export type reservation_actions_records =
    | "CREATED_RESERVATION"
    | "UPDATED_RESERVATION_DATE"
    | "CONFIRMED_RESERVATION"
    | "MADE_PAYMENT"
    | "COMPLETED_RESERVATION"
    | "CANCELLED_RESERVATION";

export type order_receipt_status =
    | "IN_PROCESS"
    | "COMPLETED"
    | "BILLED"
    | "CANCELLED"
    | "CREATED"
    | "REFUNDED"

    //WooCommerce
    | "PAYMENT_PENDING"
    | "WITH_ERRORS"

    //With online
    | "IN_TRANSIT"
    | "DELIVERED"

    //Web Admin
    | "OVERDUE";

export type prepaidPayment_status = "PAID" | "USED" | "REFUNDED";

export type order_origin =
    | "pos"
    | "admin"
    | "shop"
    | "shopapk"
    | "marketplace"
    | "apk"
    //Deprecated
    | "online";

export type production_order_mode = "FLEXIBLE" | "STRICT" | "OPEN";

export type customer_registration_way =
    | "pos"
    | "woo"
    | "shopapk"
    | "administration"
    | "shop"
    | "marketplace";

export type sex_type = "male" | "female";
export type customer_type =
    | "person"
    | "organization"
    | "cooperative"
    | "tcp"
    | "mipyme";

export type person_record_types =
    | "HIGH_PERSON"
    | "LOW_PERSON"
    | "EDIT_GENERAL_DATA"
    | "BUSINESS_CHANGED"
    | "OBSERVATION"
    | "DELET_PERSON";

export type social_network_types =
    | "WHATSAPP"
    | "FACEBOOK"
    | "TWITTER"
    | "INSTAGRAM";

export type operation_movement_status_types =
    | "APPROVED"
    | "PENDING_APPROVAL"
    | "REJECTED";

export type operation_movements_types =
    | "ENTRY"
    | "MOVEMENT"
    | "PROCESSED"
    | "OUT"
    | "SALE"
    | "REMOVED"
    | "WASTE"
    | "TRANSFORMATION";

export type operation_category_types =
    | "TRASLATE"
    | "SALE"
    | "BUY"
    | "ADJUST"
    | "PROCESSED"
    | "DISPATCH"
    | "CONTAINER"
    | "OUT"
    | "WASTE"
    | "TRANSFORMATION";

export type batch_operation = "ENTRY" | "OUT" | "SALE";

export type cash_registers_operations =
    | "MANUAL_DEPOSIT"
    | "MANUAL_WITHDRAW"
    | "MANUAL_FUND"
    | "DEPOSIT_EXCHANGE"
    | "WITHDRAW_EXCHANGE"
    | "WITHDRAW_SALE"
    | "WITHDRAW_SHIPPING_PRICE"
    | "DEPOSIT_SALE"
    | "DEPOSIT_TIP";

export type subscriptions_plans =
    | "FREE"
    | "STANDARD"
    | "POPULAR"
    | "FULL"
    | "CUSTOM";

export type app_origin =
    | "Tecopos"
    | "Tecopos-Admin"
    | "Tecopos-Alma"
    | "Tecopos-Shop"
    | "Tecopos-ShopApk"
    | "Tecopos-Management"
    | "Tecopos-Landing"
    | "Codyas-Woocommerce"
    | "Tecopos-Terminal"
    | "Tecopos-SinTerceros"
    | "Tecopos-Marketplace"
    | "Tecopos-Tecopay"
    | "Tecopos-Ticket"
    | "Tecopay-Server"
    | "Tecopos-Tv"
    | "Ticket-Server";

export type roles =
    | "GROUP_OWNER"
    | "OWNER"
    | "ADMIN"
    | "MANAGER_SALES"
    | "MANAGER_PRODUCTION"
    | "MANAGER_AREA"
    | "WEITRESS"
    | "MANAGER_CONTABILITY"
    | "CUSTOMER"
    | "MANAGER_ECONOMIC_CYCLE"
    | "PRODUCT_PROCESATOR"
    | "MANAGER_ACCESS_POINT"
    | "MANAGER_SHOP_ONLINE"
    | "CUSTOMER_OPERATOR"
    | "MANAGER_SHIFT"
    | "MANAGER_SHIPPING"
    | "MANAGER_COST_PRICES"
    | "MANAGER_CUSTOMERS"
    | "MANAGER_SUPPLIERS"
    | "MANAGER_HUMAN_RESOURCES"
    | "MANAGER_SALARY_RULES"
    | "MANAGER_CURRENCIES"
    | "MANAGER_CURRENCIES"
    | "MANAGER_CONFIGURATIONS"
    | "ANALYSIS_REPORT"
    | "MANAGER_BILLING"
    | "MARKETING_SALES"
    | "MANAGER_TV"
    | "CHIEF_PRODUCTION"
    | "BUYER";

export type measureType = "G" | "KG" | "UNIT" | "POUND" | "LITRE";

export type accessRecordType = "ENTRY" | "EXIT";

export type payments_ways =
    | "CASH"
    | "TRANSFER"
    | "CARD"
    | "CREDIT_POINT"
    | "TROPIPAY";

export type discount_types = "PERCENT" | "FIXED_CART" | "FIXED_PRODUCT";

export type accountOperationType = "debit" | "credit";

export type store_types =
    | "EC_INCOME_AREA"
    | "EC_INCOME_GENERAL"
    | "STOCK_DAILY_STATE";

export type temporal_tokens_types = "ACTIVE_USER" | "RECOVER_PASS" | "TROPIPAY";
