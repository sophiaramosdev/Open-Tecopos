export const translateFieldProduct = (field: string | boolean) => {
    switch (field) {
        case 'externalId':
            return 'ID externo';
        case 'salesCode':
            return 'código de ventas';
        case 'universalCode':
            return 'código universal';
        case 'color':
            return 'color';
        case 'hasDuration':
            return 'tiene duración';
        case 'duration':
            return 'duración';
        case 'promotionalText':
            return 'texto promocional';
        case 'type':
            return 'tipo';
        case 'newArrival':
            return 'nuevo llegada';
        case 'newArrivalAt':
            return 'llegada';
        case 'showForSale':
            return 'mostrar a la venta';
        case 'saleByWeight':
            return 'venta por peso';
        case 'isManufacturable':
            return 'es manufacturable';
        case 'stockLimit':
            return 'límite de stock';
        case 'indexableToSaleOnline':
            return 'indexable para venta en línea';
        case 'qrCode':
            return 'código QR';
        case 'barCode':
            return 'código de barras';
        case 'enableGroup':
            return 'habilitar grupo';
        case 'groupName':
            return 'nombre del grupo';
        case 'groupConversion':
            return 'conversión de grupo';
        case 'performance':
            return 'rendimiento';
        case 'isWholesale':
            return 'es al por mayor';
        case 'minimumWholesaleAmount':
            return 'cantidad mínima de venta al por mayor';
        case 'totalQuantity':
            return 'cantidad total';
        case 'measure':
            return 'medida';
        case 'suggested':
            return 'sugerido';
        case 'onSale':
            return 'en venta';
        case 'alertLimit':
            return 'límite de alerta';
        case 'isAlertable':
            return 'es alertable';
        case 'isUnderAlertLimit':
            return 'está por debajo del límite de alerta';
        case 'isPublicVisible':
            return 'visible al público';
        case 'isAccountable':
            return 'es contable';
        case 'visibleOnline':
            return 'visible en línea';
        case 'showWhenOutStock':
            return 'mostrar cuando está fuera de stock';
        case 'showRemainingQuantities':
            return 'mostrar cantidades restantes';
        case 'enableDepreciation':
            return 'habilitar depreciación';
        case 'monthlyDepreciationRate':
            return 'tasa de depreciación mensual';
        case 'averagePreparationTime':
            return 'tiempo de preparación promedio';
        case 'elaborationSteps':
            return 'pasos de elaboración';
        case 'averageCost':
            return 'costo promedio';
        case 'isCostDefined':
            return 'costo definido';
        case 'availableForReservation':
            return 'disponible para reserva';
        case 'alwaysAvailableForReservation':
            return 'siempre disponible para reserva';
        case 'reservationAvailableFrom':
            return 'reserva disponible desde';
        case 'reservationAvailableTo':
            return 'reserva disponible hasta';
        case 'deletedAt':
            return 'eliminado en';
        case 'businessId':
            return 'ID de negocio';
        case 'salesCategoryId':
            return 'ID de categoría de ventas';
        case 'productCategoryId':
            return 'ID de categoría de producto';
        case 'onSalePriceId':
            return 'ID de precio de venta';
        case true:
            return 'si';
        case false:
            return 'no';
        default:
            return field;
    }
}
