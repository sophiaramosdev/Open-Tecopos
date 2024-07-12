export const getColorProductType = (value) => {
  let data = "";

  switch (value) {
    case "RAW":
      data = "bg-purple-100 text-purple-800";
      break;
    case "WASTE":
      data = "bg-red-100 text-red-800";
      break;
    case "MANUFACTURED":
      data = "bg-orange-100 text-orange-800";
      break;
    case "ASSET":
      data = "bg-yellow-100 text-yellow-800";
      break;
    default:
      data = "bg-green-100 text-green-800";
  }

  return data;
};

export const getColorOperationInventoryType = (value) => {
  let data = "";

  switch (value) {
    case "CLOSED":
      data = "bg-rose-100 text-rose-800";
      break;
    default:
      data = "bg-green-100 text-green-800";
  }

  return data;
};

export const getColorMovementsOperationType = (value) => {
  let data = "";

  switch (value) {
    case "ENTRY":
      data = "bg-emerald-100 text-emerald-800";
      break;
    case "MOVEMENT":
      data = "bg-blue-100 text-blue-800";
      break;
    case "OUT":
      data = "bg-orange-100 text-orange-800";
      break;
    case "PROCESSED":
      data = "bg-purple-100 text-purple-800";
      break;
    case "REMOVED":
      data = "bg-red-100 text-red-800";
      break;
    case "ADJUST":
      data = "bg-yellow-100 text-yellow-800";
      break;
    case "WASTE":
      data = "bg-stone-100 text-stone-800";
      break;
    default:
      data = "bg-fuchsia-100 text-fuchsia-800";
  }

  return data;
};

export const getColorStatusOrder = (value) => {
  let data = "";

  switch (value) {
    case "BILLED":
      data = "bg-teal-100 text-teal-800";
      break;
    case "CREATED":
      data = "bg-yellow-100 text-yellow-800";
      break;
    case "IN_PROCESS":
      data = "bg-orange-100 text-orange-800";
      break;
    case "CANCELLED":
      data = "bg-red-100 text-red-800";
      break;
    default:
      data = "bg-gray-100 text-gray-800";
  }

  return data;
};

export const getColorPaymentWayOrder = (value) => {
  let data = "";

  switch (value) {
    case "CASH":
      data = "bg-emerald-100 text-emerald-800";
      break;
    case "TRANSFER":
      data = "bg-blue-100 text-blue-800";
      break;
    case "CARD":
      data = "bg-fuchsia-100 text-fuchsia-800";
      break;
    case "CREDIT_POINTS":
      data = "bg-red-100 text-red-800";
      break;
    default:
      data = "bg-orange-100 text-orange-800";
  }

  return data;
};

export const getColorCashOperation = (value) => {
  let data = "";

  switch (value) {
    case "MANUAL_DEPOSIT":
      data = "bg-emerald-100 text-emerald-800";
      break;

    case "MANUAL_WITHDRAW":
      data = "bg-red-100 text-red-800";
      break;

    case "MANUAL_FUND":
      data = "bg-blue-100 text-blue-800";
      break;

    case "DEPOSIT_EXCHANGE":
      data = "bg-emerald-100 text-emerald-800";
      break;
    case "WITHDRAW_EXCHANGE":
      data = "bg-red-100 text-red-800";
      break;
    case "WITHDRAW_SALE":
      data = "bg-red-100 text-red-800";
      break;
    case "WITHDRAW_SHIPPING_PRICE":
      data = "bg-red-100 text-red-800";
      break;
    case "DEPOSIT_SALE":
      data = "bg-emerald-100 text-emerald-800";
      break;
    case "DEPOSIT_TIP":
      data = "bg-emerald-100 text-emerald-800";
      break;

    default:
      data = "bg-orange-100 text-orange-800";
  }

  return data;
};
