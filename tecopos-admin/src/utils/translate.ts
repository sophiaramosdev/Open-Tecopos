import { DispatchStatus, ReceiptStatus } from "../interfaces/ServerInterfaces";

export const translateProductTypes = (type?: string) => {
  switch (type) {
    case "MENU":
      return "Elaborado";

    case "STOCK":
      return "Almacén";

    case "COMBO":
      return "Combo";

    case "SERVICE":
      return "Servicio";

    case "VARIATION":
      return "Variable";

    case "ADDON":
      return "Agrego";

    case "RAW":
      return "Materia Prima";

    case "MANUFACTURED":
      return "Procesado";

    case "WASTE":
      return "Desecho";

    case "ASSET":
      return "Activo";

    default:
      return "";
  }
};

export const translateAreaType = (type?: string) => {
  if (undefined) return "";
  switch (type) {
    case "STOCK":
      return "Almacén";
    case "SALE":
      return "Punto de venta";
    case "MANUFACTURER":
      return "Procesado";
    case "ACCESSPOINT":
      return "Punto de Acceso";
    default:
      return "";
  }
};

export const translateWeekDays = (day?: string) => {
  if (undefined) return "";
  switch (day) {
    case "Sunday":
      return "DOMINGO";
    case "Monday":
      return "LUNES";
    case "Tuesday":
      return "MARTES";
    case "Wednesday":
      return "MIÉRCOLES";
    case "Thursday":
      return "JUEVES";
    case "Friday":
      return "VIERNES";
    case "Saturday":
      return "SÁBADO";
    default:
      return day ?? "";
  }
};

export const translateMeasure = (value?: string) => {
  switch (value) {
    case "DRINK":
      return "Trago";

    case "POUND":
      return "Lb";

    case "KG":
      return "Kg";

    case "UNIT":
      return "U";

    case "LITRE":
      return "L";

    case "PORTION":
      return "Porción";

    default:
      return "";
  }
};

export const translateOperation = (operation?: string | null) => {
  switch (operation) {
    case "ENTRY":
      return "Entrada";

    case "EXIT":
      return "Salida";

    case "MOVEMENT":
      return "Traslado";

    case "OUT":
      return "Salida";

    case "PROCESSED":
      return "Procesado";

    case "REMOVED":
      return "Eliminado";

    case "ADJUST":
      return "Ajuste";

    case "WASTE":
      return "Desperdicios";

    case "SALE":
      return "Venta";

    case "TRANSFORMATION":
      return "Transformación";

    default:
      return "";
  }
};

export const translateEcoCycleTab = (tab?: string) => {
  switch (tab) {
    case "details":
      return "Detalles";

    case "orders":
      return "Órdenes";

    case "reports":
      return "Reportes";

    case "cashbox":
      return "Caja";

    default:
      return "";
  }
};

export const translateDispatchStatus = (
  status?: DispatchStatus | ReceiptStatus
) => {
  switch (status) {
    case "ACCEPTED":
      return "Recibido";

    case "REJECTED":
      return "Rechazado";

    case "CREATED":
      return "Pendiente";

    case "CANCELLED":
      return "Cancelado";

    case "CONFIRMED":
      return "Confirmado";

    case "DISPATCHED":
      return "Despachado";

      case "BILLED":
        return "Facturado";

    default:
      return "";
  }
};
export const translateOrderStatePay = (
  status: string
) => {
  switch (status) {
    case "PARTIAL_PAYMENT":
      return "Pago parcial";

    case "PAYMENT_PENDING":
      return "Pendiente de pago";

    case "PAID":
      return "Pagada";

    case "CANCELLED":
      return "Cancelado";
    case "REFUNDED":
      return "Rembolsado";

    default:
      break;
  }
};

export const translateOrderState = (status: string | null) => {
  switch (status) {
    case "CREATED":
      return "Creada";

    case "ACTIVE":
      return "Activa";

    case "CLOSED":
      return "Cerrada";

    case "DISPATCHED":
      return "Despachada";

    case "RECEIVED":
      return "Recibida";

    case "IN_PROCESS":
      return "Procesando";

    case "COMPLETED":
      return "Completada";

    case "PAYMENT_PENDING":
      return "Pendiente de pago";

    case "WAITING":
      return "En espera";

    case "CANCELLED":
      return "Cancelada";

    case "REFUNDED":
      return "Reembolsada";

    case "WITH_ERRORS":
      return "Con errores";

    case "BILLED":
      return "Pagada";

    case "IN_TRANSIT":
      return "En tránsito";

    case "DELIVERED":
      return "Entregada";

    case "PREFECTURE":
      return "Pre-facturada";

    case "PAID":
      return 'Pagado';

    case "USED":
      return "Utilizado";

    case "OVERDUE":
      return "Pago vencido"

    default:
      return "";
  }
};

export const translateInvoiceState = (status?: string | null) => {
  switch (status) {
    case "APPROVED":
      return "Aprobada";

    case "REJECTED":
      return "Rechazada";

    case "CLOSED":
      return "Cerrada";

    default:
      return "";
  }
};

export const translatePaymetMethods = (status?: string | null) => {
  switch (status) {
    case "CASH":
      return "Efectivo";

    case "TRANSFER":
      return "Transferencia";

    case "CARD":
      return "Tarjeta";

    case "CREDIT_POINT":
      return "Puntos";

    default:
      return status ?? "";
  }
};
export const translatePaymetMethodsReduce = (status?: string | null) => {
  switch (status) {
    case "CASH":
      return "Ef";

    case "TRANSFER":
      return "Tr";

    case "CARD":
      return "Ta";

    case "CREDIT_POINT":
      return "P";

    default:
      return status ?? "";
  }
};
export const translatePaymetMethodsShort = (status?: string | null) => {
  switch (status) {
    case "CASH":
      return "E";

    case "TRANSFER":
      return "T";

    case "CARD":
      return "Tj";

    case "CREDIT_POINT":
      return "P";

    default:
      return status ?? "";
  }
};

export const translateTypeHomeDelivery = (status?: string | null) => {
  switch (status) {
    case "FIXED":
      return "FIJA";

    case "VARIABLE":
      return "VARIABLE";

    case "BYREGION":
      return "POR REGIÓN";

    default:
      return "";
  }
};

export const translateMonths = (month?: string) => {
  switch (month) {
    case "January":
      return "Enero";
    case "February":
      return "Febrero";
    case "March":
      return "Marzo";
    case "April":
      return "Abril";
    case "May":
      return "Mayo";
    case "June":
      return "Junio";
    case "July":
      return "Julio";
    case "August":
      return "Agosto";
    case "September":
      return "Septiembre";
    case "October":
      return "Octubre";
    case "November":
      return "Noviembre";
    case "December":
      return "Diciembre";
    default:
      return "";
  }
};

export const convertBoolean = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case "true":
      return true;

    case "false":
      return false;

    default:
      return "";
  }
};

export const translateRegWay = (reg?: string) => {
  switch (reg) {
    case "woo":
      return "Woocommerce";

    case "pos":
      return "Punto de venta";

    case "online":
      return "Tienda online";

    default:
      return "-";
  }
};

export const translateOrderOrigin = (origin: string) => {
  switch (origin) {
    case "pos":
      return "Punto de venta";

    case "woo":
      return "Woocommerce";

    case "online":
      return "Tienda online";

    case "admin":
      return "Administración";

    case "shop":
      return "Tienda Web";

    case "shopapk":
      return "Tienda APK";

    case "marketplace":
      return "Marketplace";

    case "apk":
      return "Tecopos–Terminal";

    case "external":
      return "Externo";

    default:
      return "";
  }
};

export const translateActionRecords = (origin: string) => {
  switch (origin) {
    case "EDIT_GENERAL_DATA":
      return "Editar datos generales";

    case "OBSERVATION":
      return "Observaciones";

    case "LOW_PERSON":
      return "Baja";

    case "HIGH_PERSON":
      return "Alta";

    default:
      return origin;
  }
};
