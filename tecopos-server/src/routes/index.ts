import { Application } from "express";

import { apiPaths } from "./paths";
import routerSecurity from "./security";
import routerAdmin from "./administration";
import routerUpload from "./files";
import salesRouter from "./sales";
import routerReport from "./report";
import routerShipping from "./shipping";
import routerPublic from "./public";
import routerControl from "./control";
import routerLanding from "./landing";

import routerDispatch from "./administration/dispatch";
import routerArea from "./administration/area";
import routerProduct from "./administration/product";
import routerShift from "./administration/shift";
import routerStockMovement from "./administration/stockMovement";
import routerEconomicCycle from "./administration/economicCycle";
import routerProductionOrder from "./administration/productionOrder";
import routerProductStock from "./administration/productStock";
import routerProductVariation from "./administration/productVariation";
import routerProductState from "./administration/productState";
import routerProductCategory from "./administration/productCategory";
import routerExit from "./accesspoint/exit";
import routerBilling from "./administration/billing";
import routerBusinessAdmin from "./administration/business";
import routerConfigAdmin from "./administration/configurations";
import routerBusinessCategory from "./control/businessCategory";
import routerBusinessControl from "./control/business";
import routerAccount from "./administration/account";
import routerWoocommerce from "./woocommerce/woocommerce";
import routerCustomer from "./customer";
import routerPaymentGateway from "./shop/paymentGateway";
import routerReportControl from "./control/report";
import routerShopProduct from "./shop/product";
import routerShopUser from "./shop/user";
import routerShopOrder from "./shop/order";
import routerMarketing from "./administration/marketing";
import routerShopCoupons from "./shop/coupons";
import routerShopBusiness from "./shop/business";
import routerControlFixers from "./control/fixers";
import routerShopShipping from "./shop/shipping";
import routerAdministrationRecipe from "./administration/recipe";
import routerMarketPlaceUser from "./marketplace/user";
import routerMarketplaceOrder from "./marketplace/order";
import routerSinTerceros from "./sinterceros";
import routerAdminPaymentgateway from "./administration/paymentGateways";
import routerMarketPlacePaymentGateway from "./marketplace/paymentGateway";
import routerMarketplaceShipping from "./marketplace/shipping";
import routerAdministrationBatch from "./administration/batch";
import routerIdentity from "./identity";
import routerPersonCategory from "./administration/personCategory";
import routerPersonPost from "./administration/personPost";
import routerPerson from "./administration/person";
import routerHumanResource from "./administration/humanresource";
import routerSalary from "./administration/salary";
import routerServerToServer from "./server";
import routerBillingOder from "./administration/billingOrder";
import routerMarketplaceCoupons from "./marketplace/coupons";
import routerFixedCostCategory from "./administration/fixedCostCategory";
import routerBuyedReceipt from "./administration/buyedReceipt";
import routerModifier from "./administration/modifier";
import routerReportBilling from "./report/billing";
import routerReservation from "./administration/reservations";
import routerTvAdmin from "./tv/admin";
import routerTvCustomer from "./tv/customer";

export const routes = (app: Application) => {
    //Security & Login
    app.use(apiPaths.security, routerSecurity);

    //Server to server
    app.use(apiPaths.serverToServer, routerServerToServer);

    //Administration
    app.use(apiPaths.administration, routerAdmin);
    app.use(apiPaths.administration, routerDispatch);
    app.use(apiPaths.administration, routerArea);
    app.use(apiPaths.administration, routerProduct);
    app.use(apiPaths.administration, routerShift);
    app.use(apiPaths.administration, routerStockMovement);
    app.use(apiPaths.administration, routerEconomicCycle);
    app.use(apiPaths.administration, routerProductionOrder);
    app.use(apiPaths.administration, routerProductStock);
    app.use(apiPaths.administration, routerProductVariation);
    app.use(apiPaths.administration, routerProductState);
    app.use(apiPaths.administration, routerProductCategory);
    app.use(apiPaths.administration, routerBilling);
    app.use(apiPaths.administration, routerBusinessAdmin);
    app.use(apiPaths.administration, routerConfigAdmin);
    app.use(apiPaths.administration, routerAccount);
    app.use(apiPaths.administration, routerBillingOder);
    app.use(apiPaths.administrationMarketing, routerMarketing);
    app.use(apiPaths.administrationShipping, routerShipping);
    app.use(apiPaths.administrationRecipe, routerAdministrationRecipe);
    app.use(apiPaths.administrationPaymentWay, routerAdminPaymentgateway);
    app.use(apiPaths.administrationBatch, routerAdministrationBatch);
    app.use(apiPaths.administrationFixedCostCategory, routerFixedCostCategory);
    app.use(apiPaths.administrationBuyedReceipt, routerBuyedReceipt);
    app.use(apiPaths.administrationModifier, routerModifier);
    app.use(apiPaths.administrationReservations, routerReservation);

    //AccessPoint
    app.use(apiPaths.accesspoint, routerExit);

    //Tv
    app.use(apiPaths.tv, routerTvAdmin);
    app.use(apiPaths.tv, routerTvCustomer);

    //Human resources
    app.use(apiPaths.humanResource, routerHumanResource);
    app.use(apiPaths.humanResourcePersonCategory, routerPersonCategory);
    app.use(apiPaths.humanResourcePersonPost, routerPersonPost);
    app.use(apiPaths.humanResourcePerson, routerPerson);
    app.use(apiPaths.salary, routerSalary);
    app.use(apiPaths.salaryRules, routerSalary);

    //Billing
    app.use(apiPaths.reportBilling, routerReportBilling);

    //Upload
    app.use(apiPaths.files, routerUpload);

    //Sales
    app.use(apiPaths.sales, salesRouter);

    //MarketPlace
    app.use(apiPaths.marketplaceUser, routerMarketPlaceUser);
    app.use(apiPaths.marketplaceOrder, routerMarketplaceOrder);
    app.use(apiPaths.marketPlaceShipping, routerMarketplaceShipping);
    app.use(apiPaths.marketPlaceCoupons, routerMarketplaceCoupons);
    app.use(
        apiPaths.marketPlacePaymentgateway,
        routerMarketPlacePaymentGateway
    );
    //MarketPlace
    app.use(apiPaths.marketplaceUser, routerMarketPlaceUser);
    app.use(apiPaths.marketplaceOrder, routerMarketplaceOrder);
    app.use(apiPaths.marketPlaceShipping, routerMarketplaceShipping);
    app.use(
        apiPaths.marketPlacePaymentgateway,
        routerMarketPlacePaymentGateway
    );

    //Control & General configurations
    app.use(apiPaths.identity, routerIdentity);

    //Control & General configurations
    app.use(apiPaths.control, routerControl);
    app.use(apiPaths.control, routerBusinessCategory);
    app.use(apiPaths.control, routerBusinessControl);
    app.use(apiPaths.controlReports, routerReportControl);
    app.use(apiPaths.controlFixers, routerControlFixers);

    //Report
    app.use(apiPaths.report, routerReport);

    //Shipping
    app.use(apiPaths.shipping, routerShipping);

    //Shipping
    app.use(apiPaths.customer, routerCustomer);

    //Public
    app.use(apiPaths.public, routerPublic);

    //Landing
    app.use(apiPaths.landing, routerLanding);

    //Sin Terceros
    app.use(apiPaths.sinTerceros, routerSinTerceros);

    //Shop
    app.use(apiPaths.shop, routerPaymentGateway);
    app.use(apiPaths.shopProduct, routerShopProduct);
    app.use(apiPaths.shopUser, routerShopUser);
    app.use(apiPaths.shopOrder, routerShopOrder);
    app.use(apiPaths.shopCoupons, routerShopCoupons);
    app.use(apiPaths.shopBusiness, routerShopBusiness);
    app.use(apiPaths.shopShipping, routerShopShipping);

    //Woocommerce
    app.use(apiPaths.woocommerce, routerWoocommerce);
};
