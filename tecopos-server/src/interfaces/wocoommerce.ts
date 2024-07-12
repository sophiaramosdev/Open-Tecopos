export interface Address {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
}

export interface ExtendedAddress extends Address {
    email: "";
}

export type order_status =
    | "pending"
    | "processing"
    | "on-hold"
    | "completed"
    | "cancelled"
    | "refunded"
    | "failed"
    | "trash";

export interface WooOrder {
    id: number;
    parent_id: number;
    number: string;
    order_key: string;
    created_via: string;
    version: string;
    status: order_status;
    currency: string;
    date_created: Date;
    date_created_gmt: Date;
    date_modified: Date;
    date_modified_gmt: Date;
    discount_total: string;
    discount_tax: string;
    shipping_total: string;
    shipping_tax: string;
    cart_tax: string;
    total: string;
    total_tax: string;
    prices_include_tax: boolean;
    customer_id: number;
    customer_ip_address: string;
    customer_user_agent: string;
    customer_note: string;
    billing: ExtendedAddress;
    shipping: Address;
    payment_method: string;
    payment_method_title: string;
    transaction_id: string;
    date_paid: Date;
    date_paid_gmt: Date;
    date_completed: Date;
    date_completed_gmt: Date;
    cart_hash: string;
    meta_data: Array<MetaDataInterface>;
    line_items: Array<LineItem>;
    tax_lines: Array<Tax>;
    set_paid: boolean;
}

export interface WooCustomer {
    id: number;
    date_created: Date;
    date_created_gmt: Date;
    date_modified: Date;
    date_modified_gmt: Date;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    username: string;
    billing: ExtendedAddress;
    shipping: Address;
    is_paying_customer: boolean;
    avatar_url: string;
    meta_data: MetaDataInterface[];
}

export interface WooPaymentGateway {
    id: string;
    title: string;
    description: string;
    enabled: boolean;
    method_title: string;
    method_description: string;
}

export interface LineItem {
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    taxes: Array<Tax>;
    meta_data: Array<MetaDataInterface>;
    sku: string;
    price: string;
}

export interface Tax {
    id: number;
    rate_code: string;
    rate_id: string;
    label: string;
    compound: boolean;
    tax_total: string;
    shipping_tax_total: string;
    meta_data: Array<MetaDataInterface>;
}

export interface MetaDataInterface {
    id: number;
    value: string;
    key: string;
}

export interface WooProduct {
    id: number;
    name: string;
    slug: string;
    permalink: string;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    type: "simple" | "variable" | "grouped" | "external";
    status: string;
    featured: boolean;
    catalog_visibility: string;
    description: string;
    short_description: string;
    sku: string;
    price: string;
    regular_price: string;
    sale_price: string;
    price_html: string;
    on_sale: boolean;
    purchasable: boolean;
    total_sales: number;
    virtual: boolean;
    downloadable: boolean;
    download_limit: number;
    download_expiry: number;
    external_url: string;
    button_text: string;
    tax_status: string;
    tax_class: string;
    manage_stock: boolean;
    stock_quantity: string;
    stock_status: string;
    sold_individually: boolean;
    weight: string;
    dimensions: Dimension;
    shipping_required: boolean;
    shipping_taxable: boolean;
    shipping_class: string;
    shipping_class_id: number;
    reviews_allowed: boolean;
    average_rating: string;
    rating_count: number;
    related_ids: Array<number>;
    upsell_ids: Array<number>;
    cross_sell_ids: Array<number>;
    parent_id: number;
    purchase_note: string;
    tags: Array<Tag>;
    images: Array<ImageInterface>;
    attributes: Array<ProductAttribute>;
    default_attributes: Array<ProductAttribute>;
    variations: Array<number>;
    grouped_products: Array<number>;
    menu_order: number;
    meta_data: Array<MetaDataItem>;
}

export interface MetaDataItem {
    id?: number;
    key: string;
    value: string;
}

export interface ImageInterface {
    id: number;
    date_created: Date;
    date_created_gmt: Date;
    date_modified: Date;
    date_modified_gmt: Date;
    src: string;
    name: string;
    thumbnail: string;
}

export interface Tag {
    id: number;
    name: string;
    slug: string;
}

export interface Dimension {
    length: string;
    width: string;
    height: string;
}

export interface ProductAttribute {
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: Array<string>;
}
