export interface InternalHelperResponse {
    status: number;
    message?: string;
    data?: any;
}

export interface ProductItemMove {
    productId: number;
    variationId?: number | undefined;
    quantity: number;
}
