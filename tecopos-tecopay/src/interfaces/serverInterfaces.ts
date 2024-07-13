export type JobNumberInterface = {
  entityId: number;
  businessId: number;
};

export type PermissionCodes =
  | "ALL"
  | "ENTITIES_VIEW"
  | "ENTITIES_EDIT"
  | "USERS_FULL"
  | "USERS_VIEW"
  | "USERS_CREATE"
  | "USERS_EDIT"
  | "USERS_DELETE"
  | "ACCOUNTS_FULL"
  | "ACCOUNTS_VIEW"
  | "ACCOUNTS_CREATE"
  | "ACCOUNTS_RELOAD"
  | "ACCOUNTS_EDIT"
  | "ACCOUNTS_DELETE"
  | "REQUESTS_FULL"
  | "REQUESTS_VIEW"
  | "REQUESTS_CREATE"
  | "REQUESTS_UPDATE"
  | "REQUESTS_DELETE"
  | "CARDS_FULL"
  | "CARDS_VIEW"
  | "CARDS_UPDATE"
  | "TRANSACTIONS_FULL"
  | "TRANSACTIONS_EXPORT"
  | "TRACES_ALL"
  | "TRACES_EXPORT";
