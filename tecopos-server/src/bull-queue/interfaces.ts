export interface JobECData {
    code: jobs_ec_code;
    params: any;
}

export type jobs_ec_code =
    | "OPEN_CLOSE_EC"
    | "AFTER_ECONOMIC_CYCLE_CLOSE"
    | "CLOSE_EC";

export interface JobSystemData {
    code: jobs_sys_code;
    params: any;
}

export type jobs_sys_code =
    | "INACTIVE_BUSINESS"
    | "SAVE_STOCK_STATE"
    | "CANCEL_ORDERS_NOT_PAYED";

export interface JobImageData {
    code: jobs_image_code;
    params: any;
}

export type jobs_image_code = "SET_BLURHASH";

export interface JobPeopleData {
    code: jobs_people_code;
    params: any;
}

export type jobs_people_code = "CHECK_PEOPLE_IN_BUSINESS";

export interface JobAccountData {
    code: jobs_account_code;
    params: any;
}

export type jobs_account_code = "DAILY_BALANCE";

export interface JobProductionOrderData {
    code: jobs_production_order_data;
    params: any;
}

export type jobs_production_order_data = "UPDATE_PRODUCTION_ORDER_COST";

export interface JobPBuyedReceiptData {
    code: jobs_buyed_received_data;
    params: any;
}

export type jobs_buyed_received_data = "UPDATE_COST";

export interface JobNotificationData {
    code: jobs_notification_code;
    params: any;
}

export type jobs_notification_code =
    | "SEND_CLIENT"
    | "SEND_USER"
    | "NOTIFY_ORDER_STATUS_CHANGED";

export interface JobOrderData {
    code: jobs_order_code;
    params: any;
}

export type jobs_order_code = "CANCEL_ORDER" | "REGISTER_RECORDS";

export type jobs_woo_code =
    | "WOO_BUSINESS_CHECKER"
    | "CREATE_CATEGORY"
    | "UPDATE_CATEGORY"
    | "DELETE_CATEGORY"
    | "CREATE_PRODUCT"
    | "UPDATE_PRODUCT"
    | "DELETE_PRODUCT"
    | "EDIT_ORDER"
    | "UPDATE_PRODUCT_STOCK"
    | "UPDATE_PRODUCT_STOCK_QUANTITIES"
    | "UPDATE_PRODUCT_ATTRIBUTES";

export interface JobWooData {
    code: jobs_woo_code;
    params: any;
}

export interface JobEmailData {
    code: jobs_email_code;
    params: any;
}

export type jobs_email_code =
    | "MASTER_CHANGE"
    | "NEW_ADMIN_USER"
    | "CHANGE_PASS_REQUEST"
    | "CODE_TO_RECOVER_PASS"
    | "CODE_TO_RECOVER_PASS_FROM_MARKETPLACE"
    | "NEW_ORDER_NOTIFICATION"
    | "NEW_ORDER_NOTIFICATION_ADMIN"
    | "NOTIFICATION_RESERVATIONS"
    | "CHANGE_ORDER_STATUS_NOTIFICATION";


export interface JobProductData {
    code: jobs_products_code;
    params: any;
}

export type jobs_products_code =
    | "PROPAGATE_COST"
    | "UPDATE_COST"
    | "CHECKING_PRODUCT"
    | "ANALYZE_COMBO_DISPONIBILITY"
    | "UPDATE_RECIPE_COST"
    | "PROPAGATE_RECIPE_COST"
    | "DEPRECIATE_PRODUCT";

export interface SocketData {
    code: socket_code;
    params: any;
}

export type socket_code =
    | "NEW_BULK_ENTRY"
    | "NEW_ACCESSPOINT_TICKET"
    | "BULK_OUT"
    | "PROCESS_PRODUCTS_IN_ORDER"
    | "BULK_DELETE_SALE"
    | "BULK_MOVEMENT_OUT"
    | "PROCESS_A_FAST_SALE"
    | "UPDATE_ORDER"
    | "CANCEL_ORDER"
    | "PROCESS_TICKETS_PRODUCTION_AREA"
    | "DELETE_TICKET_IN_PRODUCTION_AREA"
    | "NEW_DISPATCH"
    | "ACCEPT_DISPATCH"
    | "REJECT_DISPATCH"
    | "UPDATE_DISPATCH"
    | "NOTIFY_USER"
    | "UPDATE_STATUS_SELLED_PRODUCT_SALE_AREA"
    | "MOVE_ORDER_BETWEEN_AREAS"
    | "UPDATE_NOTE_SELLED_PRODUCT_MANUFACTURER_AREA"
    | "MANUFACTURER_STOCK_MOVEMENT_DELETE"
    | "MANUFACTURER_STOCK_MOVEMENT_ADD"
    | "JOIN_ORDERS"
    | "BULK_OUT_WASTE"
    | "UPDATE_TICKET_PRODUCTION_AREA";
