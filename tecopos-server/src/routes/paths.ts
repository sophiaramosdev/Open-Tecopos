const API_URL = "/api";
const API_VERSION = "/v1";

export const apiPaths = {
    security: `${API_URL}${API_VERSION}/security`,

    //ServerToServer
    serverToServer: `${API_URL}${API_VERSION}/servertoserver`,

    //Administration
    administration: `${API_URL}${API_VERSION}/administration`,
    administrationMarketing: `${API_URL}${API_VERSION}/administration/marketing`,
    administrationShipping: `${API_URL}${API_VERSION}/administration/shipping`,
    administrationRecipe: `${API_URL}${API_VERSION}/administration/recipe`,
    administrationPaymentWay: `${API_URL}${API_VERSION}/administration/paymentgateway`,
    administrationBatch: `${API_URL}${API_VERSION}/administration/batch`,
    administrationFixedCostCategory: `${API_URL}${API_VERSION}/administration/fixedcostcategory`,
    administrationBuyedReceipt: `${API_URL}${API_VERSION}/administration/buyedreceipt`,
    administrationModifier: `${API_URL}${API_VERSION}/administration/modifier`,
    administrationReservations: `${API_URL}${API_VERSION}/administration/reservation`,

    //Human resources
    humanResource: `${API_URL}${API_VERSION}/administration/humanresource`,
    humanResourcePersonCategory: `${API_URL}${API_VERSION}/administration/humanresource/personcategory`,
    humanResourcePersonPost: `${API_URL}${API_VERSION}/administration/humanresource/personpost`,
    humanResourcePerson: `${API_URL}${API_VERSION}/administration/humanresource/person`,
    salary: `${API_URL}${API_VERSION}/administration/humanresource/salary`,
    salaryRules: `${API_URL}${API_VERSION}/administration//humanresource/salary/rules`,

    files: `${API_URL}${API_VERSION}/files`,
    sales: `${API_URL}${API_VERSION}/sales`,
    controlReports: `${API_URL}${API_VERSION}/control/reports`,
    report: `${API_URL}${API_VERSION}/report`,
    shipping: `${API_URL}${API_VERSION}/shipping`,
    customer: `${API_URL}${API_VERSION}/customer`,
    public: `${API_URL}${API_VERSION}/public`,
    landing: `${API_URL}${API_VERSION}/landing`,
    accesspoint: `${API_URL}${API_VERSION}/accesspoint`,
    woocommerce: `${API_URL}${API_VERSION}/woocommerce`,

    //Report
    reportBilling: `${API_URL}${API_VERSION}/report/billing`,

    //Report
    tv: `${API_URL}${API_VERSION}/tv`,

    //Control
    identity: `${API_URL}${API_VERSION}/identity`,

    //Control
    control: `${API_URL}${API_VERSION}/control`,
    controlFixers: `${API_URL}${API_VERSION}/control/fixers`,

    //Shop
    shop: `${API_URL}${API_VERSION}/shop`,
    shopProduct: `${API_URL}${API_VERSION}/shop/product`,
    shopUser: `${API_URL}${API_VERSION}/shop/user`,
    shopOrder: `${API_URL}${API_VERSION}/shop/order`,
    shopCoupons: `${API_URL}${API_VERSION}/shop/coupon`,
    shopBusiness: `${API_URL}${API_VERSION}/shop/business`,
    shopShipping: `${API_URL}${API_VERSION}/shop/shipping`,

    //Marketplace
    marketplace: `${API_URL}${API_VERSION}/marketplace`,
    marketplaceUser: `${API_URL}${API_VERSION}/marketplace/user`,
    marketplaceOrder: `${API_URL}${API_VERSION}/marketplace/order`,
    marketPlacePaymentgateway: `${API_URL}${API_VERSION}/marketplace/paymentgateway`,
    marketPlaceShipping: `${API_URL}${API_VERSION}/marketplace/shipping`,
    marketPlaceCoupons: `${API_URL}${API_VERSION}/marketplace/coupon`,

    //Control
    sinTerceros: `${API_URL}${API_VERSION}/sinterceros`,
};
