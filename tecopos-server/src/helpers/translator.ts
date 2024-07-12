import {
    account_actions_records,
    order_receipt_actions,
    order_receipt_status,
    reservation_actions,
} from "../interfaces/nomenclators";

export const getTitleOrderRecord = (
    action: order_receipt_actions | undefined
) => {
    let title = "";

    switch (action) {
        case "ORDER_EDITED":
            title = "Orden editada";
            break;
        case "ORDER_SYNCRONIZED":
            title = "Orden sincronizada";
            break;
        case "ORDER_CREATED":
            title = "Orden creada";
            break;
        case "PRODUCT_ADDED":
            title = "Producto adicionado";
            break;
        case "PRODUCT_REMOVED":
            title = "Producto eliminado";
            break;
        case "ORDER_MOVED":
            title = "Traslado de orden";
            break;
        case "ORDER_CLOSED":
            title = "Orden cerrada";
            break;
        case "ORDER_REOPEN":
            title = "Orden re-abierta";
            break;
        case "ORDER_CANCELLED":
            title = "Orden cancelada";
            break;
        case "ORDER_BILLED":
            title = "Orden facturada";
            break;
        case "ORDER_REFUNDED":
            title = "Orden reembolsada";
            break;
        case "ORDER_REMOVED_BILLED":
            title = "Eliminación de pago";
            break;
        case "COMPLETED":
            title = "Orden completada";
            break;
        case "IN_PROCESS":
            title = "Procesando";
            break;
        case "WAITING":
            title = "En espera";
            break;
        case "WITH_ERRORS":
            title = "Con errores";
            break;
        case "PAYMENT_FAILS":
            title = "Fallo en el pago";
            break;
        case "ORDER_PARTIAL_BILLED":
            title = "Pago parcial";
            break;
        case "ADVANCE_PAYMENT_USED":
            title = "Pago anticipado usado";
            break;
        case "PAYMENT_REMINDER_SENT":
            title = "Recordatorio de pago enviado";
            break;
        case "TRANSFORMED_TO_INVOICE":
            title = "Transformada a factura";
            break;
        case "PARTIAL_PAYMENT_REMOVED":
            title = "Pago parcial eliminado";
            break;
        case "RESERVATION_CANCELLED":
            title = "Reserva cancelada";
            break;
        case "RESERVATION_REFUNDED":
            title = "Reserva reembolsada";
            break;
        default:
            break;
    }

    return title;
};

export const getTitleAccountRecord = (
    action: account_actions_records | undefined
) => {
    let title = "";

    switch (action) {
        case "ACCOUNT_CREATED":
            title = "Cuenta bancaria creada";
            break;
        case "ACCOUNT_EDITED":
            title = "Cuenta bancaria editada";
            break;
        case "ACCOUNT_DELETED":
            title = "Cuenta bancaria eliminada";
            break;
        case "OPERATION_ADDED":
            title = "Nueva operación";
            break;
        case "OPERATION_EDITED":
            title = "Operación editada";
            break;
        case "OPERATION_DELETED":
            title = "Operación eliminada";
            break;
        case "ACCOUNT_TRANSFERRED":
            title = "Cuenta bancaria transferida";
            break;
        case "ADD_USER_TO_ACCOUNT":
            title = "Se agregó un nuevo usuario a la cuenta";
            break;
        case "DELETE_USER_TO_ACCOUNT":
            title = "Se le eliminó el acceso de un usuario a la cuenta";
            break;
        case "BALANCE_STATUS":
            title = "Se generó un subtotal de Balance";
            break;
        default:
            break;
    }

    return title;
};

export const getTitleReservationRecord = (
    action: reservation_actions | undefined
) => {
    let title = "";

    switch (action) {
        case "RESERVATION_CREATED":
            title = "Reserva creada";
            break;
        case "RESERVATION_EDITED":
            title = "Reserva editada";
            break;
        case "RESERVATION_CANCELLED":
            title = "Reserva cancelada";
            break;
        case "RESERVATION_CONFIRMED":
            title = "Reserva confirmada";
            break;
        case "PAYMENT_RECEIVED":
            title = "Pago recibido";
            break;
        case "RESERVATION_COMPLETED":
            title = "Reserva completada";
            break;
        case "RESERVATION_REFUNDED":
            title = "Reserva reembolsada";
            break;
        default:
            break;
    }

    return title;
};
export const getOrderStatus = (action: order_receipt_status) => {
    let title = "";

    switch (action) {
        case "BILLED":
            title = "Facturada";
            break;
        case "CANCELLED":
            title = "Cancelada";
            break;
        case "COMPLETED":
            title = "Completada";
            break;
        case "CREATED":
            title = "Creada";
            break;
        case "DELIVERED":
            title = "Entregada";
            break;
        case "IN_PROCESS":
            title = "En proceso";
            break;
        case "IN_TRANSIT":
            title = "En tránsito";
            break;
        case "PAYMENT_PENDING":
            title = "Pendiente de pago";
            break;
        case "REFUNDED":
            title = "Reembolsada";
            break;
        case "WITH_ERRORS":
            title = "Con errores";
            break;
        default:
            break;
    }

    return title;
};


export function translatePropertyPerson(property: string) {
    switch (property) {
        case 'firstName':
            return 'nombre';
        case 'lastName':
            return 'apellido';
        case 'isActive':
            return 'activo';
        case 'isInBusiness':
            return 'en negocios';
        case 'observations':
            return 'observaciones';
        case 'sex':
            return 'sexo';
        case 'birthAt':
            return 'Fecha de nacimiento';
        case 'qrCode':
            return 'código QR';
        case 'barCode':
            return 'Código de barras';
        default:
            return property;
    }
}

export function translateFieldProduct(property: string | boolean): string {
    switch (property) {
        case 'name':
            return 'Nombre';
        case 'salesCode':
            return 'Código de Ventas';
        case 'universalCode':
            return 'Código Universal';
        case 'description':
            return 'Descripción';
        case 'promotionalText':
            return 'Texto Promocional';
        case 'newArrivalAt':
            return 'Fecha de Llegada';
        case 'showForSale':
            return 'Mostrar para la venta';
        case 'saleByWeight':
            return 'Venta por peso';
        case 'isManufacturable':
            return 'Manufacturable';
        case 'stockLimit':
            return 'Límite de stock';
        case 'indexableToSaleOnline':
            return 'Venta en línea';
        case 'qrCode':
            return 'Código QR';
        case 'barCode':
            return 'Código de barras';
        case 'enableGroup':
            return 'Habilitar grupo';
        case 'groupName':
            return 'Nombre del grupo';
        case 'groupConvertion':
            return 'Conversión de grupo';
        case 'performance':
            return 'Rendimiento';
        case 'isWholesale':
            return 'Venta al por mayor';
        case 'minimunWholesaleAmount':
            return 'Cantidad mínima para Venta al por mayor';
        case 'totalQuantity':
            return 'Cantidad total';
        case 'measure':
            return 'Medida';
        case 'suggested':
            return 'Sugerido';
        case 'onSale':
            return 'En Venta';
        case 'onSaleType':
            return 'Tipo de descuento';
        case 'onSaleDiscountAmount':
            return 'Monto del descuento';
        case 'alertLimit':
            return 'Límite de alerta';
        case 'isAlertable':
            return 'Alertable';
        case 'isUnderAlertLimit':
            return 'Límite de alerta';
        case 'isPublicVisible':
            return 'Visible públicamente';
        case 'isAccountable':
            return 'Contabilizable';
        case 'visibleOnline':
            return 'Visible en línea';
        case 'showWhenOutStock':
            return 'Mostrar cuando no hay stock';
        case 'showRemainQuantities':
            return 'Mostrar cantidades restantes';
        case 'enableDepreciation':
            return 'Habilitar depreciación';
        case 'monthlyDepreciationRate':
            return 'Tasa de depreciación mensual';
        case 'averagePreparationTime':
            return 'Tiempo medio de preparación';
        case 'elaborationSteps':
            return 'Pasos de elaboración';
        case 'averageCost':
            return 'Costo promedio';
        case 'isCostDefined':
            return 'Costo definido';
        case 'showWhenOutStock':
            return 'Mostrar cundo esta agotado';
        case 'showRemainQuantities':
            return 'Mostrar cantidades restantes';
        case true:
            return 'si'
        case false:
            return 'no'
        default:
            return property;
    }
}
