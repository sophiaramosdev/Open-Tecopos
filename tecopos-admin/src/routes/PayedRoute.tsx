import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import AppContainer from "../containers/AppContainer";
import { HomePage } from "../pages";
import NotFoundPage from "../pages/NotFoundPage";
import PriceSystemConfig from "../containers/config/PriceSystemConfig";
import CurrenciesConfig from "../containers/config/CurrenciesConfig";
import RegionConfig from "../containers/config/RegionConfig";
import ConfigMain from "../containers/config/ConfigMain";
import ListAllOrders from "../containers/store/ListAllOrders";
import { Loading } from "../components";
import { useAppSelector } from "../store/hooks";
import OrdersEcoCycle from "../containers/economicCycles/OrdersEcoCycle";
import AttendanceRecord from "../containers/humanResources/attendanceRecord/AttendanceRecord";
import Generator from "../containers/humanResources/salary/all/Generator";
import ListRules from "../containers/humanResources/salary/rules/ListRules";
import Historical from "../containers/humanResources/salary/historical/Historical";
import HistoricalDetails from "../containers/humanResources/salary/historical/HistoricalDetails";
import BillingSummary from "../containers/billing/summary/BillingSummary";
import ListCustomerCategory from "../containers/onlineClients/categories/ListCustomerCategories";
import ReservationSummary from "../containers/reservations/analisys/ReservationsSummary";
import ReservationSettingsMain from "../containers/reservations/settings/ReservationSettingsMain";
import CalendarReservation from "../containers/reservations/calendar/CalendarReservation";
import useServer from "../api/useServerMain";
import { ListCoupons } from "../containers/products/coupons/ListCoupons";
import AllReservations from "../containers/reservations/calendar/allReservations/AllReservations";
import FixedCosts from "../containers/config/FixedCosts";
import AllReports from "../containers/analysis/AllReports";
import CartDigital from "../containers/cardDigital/CartDigital";

//Areas
const ListAreas = lazy(() => import("../containers/areas/ListAreas"));

const DetailAreaContainer = lazy(
  () => import("../containers/areas/DetailAreaContainer")
);

//Almacenes
const ListStocks = lazy(() => import("../containers/areas/ListStocks"));

const DetailStockContainer = lazy(
  () => import("../containers/areas/stock/DetailStockContainer")
);

const ListStockDispatches = lazy(
  () => import("../containers/areas/stock/dispatch/ListStockDispatches")
);

const ReportContainer = lazy(
  () => import("../containers/areas/stock/reports/ReportContainer")
);

const BuyReceiptList = lazy(
  () => import("../containers/areas/stock/buy/BuyReceiptList")
);

//Productos
const ListProducts = lazy(() => import("../containers/products/ListProducts"));

const ListAllProductsReadyForSale = lazy(
  () => import("../containers/products/ListAllProductsReadyForSale")
);

const ListStockCategories = lazy(
  () => import("../containers/products/ListStockCategories")
);
const ListResource = lazy(() => import("../containers/products/ListResource"));

const ListSalesCategories = lazy(
  () => import("../containers/products/ListSalesCategories")
);

//Órdenes de producción
const ListProductionOrders = lazy(
  () => import("../containers/productionOrders/orders/ListProductionOrders")
);

//Recetario
const ListRecipes = lazy(
  () => import("../containers/productionOrders/recipe/ListRecipes")
);

//Ciclos económicos
const ListEcoCyclesPage = lazy(
  () => import("../containers/economicCycles/ListEcoCycles")
);

const DetailEcoCycleContainer = lazy(
  () => import("../containers/economicCycles/DetailEcoCycleContainer")
);

const EconomicCyclesAnalysis = lazy(
  () => import("../containers/economicCycles/analysis/EconomicCyclesAnalysis")
);

//Cuentas bancarias
const ListBankAccounts = lazy(
  () => import("../containers/bankAccount/ListBankAccounts")
);

const MainBankAccount = lazy(
  () => import("../containers/bankAccount/bankAccounts/MainBankAccount")
);

const MainBankAccountReport = lazy(
  () => import("../containers/bankAccount/reports/MainBankAccountReport")
);

const ListBalance = lazy(
  () => import("../containers/bankAccount/listbalance/ListBalance")
);

//Usuarios
const ListUsers = lazy(
  () => import("../containers/humanResources/users/ListUsers")
);
const ListPeople = lazy(
  () => import("../containers/humanResources/persons/ListPeople")
);
const ListCategories = lazy(
  () => import("../containers/humanResources/categories/ListCategories")
);
const ListPost = lazy(
  () => import("../containers/humanResources/post/ListPosts")
);
// const ListAccessRecord = lazy(() => import("../containers/humanResources/ListAccessRecord"));
const SalaryContainer = lazy(
  () => import("../containers/humanResources/salary/SalaryContainer")
);

//Clientes
const OnlineClientsContainer = lazy(
  () => import("../containers/onlineClients/OnlineClientsContainer")
);

const DetailOnlineClientContainer = lazy(
  () => import("../containers/onlineClients/DetailOnlineClientContainer")
);

//Proveedores
const ListSuppliers = lazy(
  () => import("../containers/suppliers/ListSuppliers")
);

const DetailSupplier = lazy(
  () => import("../containers/suppliers/DetailSupplier")
);

//Facturación
const AllRegistersList = lazy(
  () => import("../containers/billing/register/AllRegistersList")
);

// Cobros vencidos
const OverduePayments = lazy(
  () => import("../containers/billing/overduePayments/OverduePayments")
);

// Pagos anticipados
const AllPrepaidList = lazy(
  () => import("../containers/billing/prepaid/AllPrepaidList")
);

// Análisis
const BillingAnalysis = lazy(
  () => import("../containers/billing/analysis/BillingAnalysis")
);

//Tienda
const StoreGalery = lazy(() => import("../containers/store/StoreGalery"));

//Configurations
const MyBusiness = lazy(() => import("../containers/config/MyBusiness"));

const PayedRoute = () => {
  const { business } = useAppSelector((state) => state.init);
  const { allowRoles } = useServer();
  const navigate = useNavigate();

  useEffect(() => {
    if (!allowRoles(["ADMIN"])) {
      if (allowRoles(["MANAGER_AREA"], true)) {
        navigate("/stocks");
      } else if (allowRoles(["MANAGER_CONTABILITY"], true)) {
        navigate("/bank_accounts");
      } else if (allowRoles(["CHIEF_PRODUCTION"], true)) {
        navigate("/orders");
      } else if (
        allowRoles(
          ["MANAGER_ECONOMIC_CYCLE", "MANAGER_SHIFT", "MANAGER_SALES"],
          true
        )
      ) {
        navigate("/ecocycle");
      } else if (allowRoles(["MANAGER_SHOP_ONLINE"], true)) {
        navigate("/store/orders");
      } else if (
        allowRoles(["MANAGER_COST_PRICES", "PRODUCT_PROCESATOR"], true)
      ) {
        navigate("/products/all");
      } else if (allowRoles(["MANAGER_CUSTOMERS"], true)) {
        navigate("/clients/all");
      } else if (allowRoles(["MANAGER_SUPPLIERS"], true)) {
        navigate("/suppliers");
      } else if (allowRoles(["MANAGER_HUMAN_RESOURCES"], true)) {
        !!business?.configurationsKey.find(
          (itm) => itm.key === "module_human_resources" && itm.value === "true"
        )
          ? navigate("/human_resources/people")
          : navigate("/human_resources/users");
      } else if (allowRoles(["MANAGER_SALARY_RULES"], true)) {
        navigate("/salary/generator");
      } else if (allowRoles(["MANAGER_CURRENCIES"], true)) {
        navigate("/configurations/currencies");
      } else if (allowRoles(["MANAGER_CONFIGURATIONS"], true)) {
        navigate("/configurations/my_business");
      } else if (allowRoles(["MANAGER_BILLING"], true)) {
        navigate("/billing/registers");
      } else if (allowRoles(["MARKETING_SALES"], true)) {
        navigate("/products/sales");
      } else if (allowRoles(["BUYER"], true)) {
        navigate("/stocks/receipt");
      }
    }
  }, []);

  const module_booking =
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true";

  return (
    <Routes>
      <Route path="/" element={<AppContainer />}>
        {/**Home */}
        {allowRoles(["ADMIN", "ANALYSIS_REPORT"]) && (
          <Route index element={<HomePage />} />
        )}
        {/**Stocks */}
        {allowRoles(["ADMIN", "MANAGER_AREA", "ANALYSIS_REPORT", "BUYER"]) && (
          <>
            <Route
              index={allowRoles(["MANAGER_AREA"], true)}
              path="/stocks"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListStocks />
                </Suspense>
              }
            />
            <Route
              path="/stocks/:stockId"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <DetailStockContainer />
                </Suspense>
              }
            />
            <Route
              path="/stocks/dispatches"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListStockDispatches />
                </Suspense>
              }
            />
            <Route
              path="/stocks/analysis"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ReportContainer />
                </Suspense>
              }
            />
            <Route
              path="/stocks/receipt"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <BuyReceiptList />
                </Suspense>
              }
            />
          </>
        )}
        {/**Products */}
        {allowRoles([
          "ADMIN",
          "PRODUCT_PROCESATOR",
          "MANAGER_COST_PRICES",
          "MANAGER_BILLING",
          "MANAGER_SALES",
          "MANAGER_SHIFT",
          "MARKETING_SALES",
        ]) && (
          <>
            {allowRoles([
              "ADMIN",
              "PRODUCT_PROCESATOR",
              "MANAGER_COST_PRICES",
            ]) && (
              <>
                <Route
                  index={allowRoles(
                    ["PRODUCT_PROCESATOR", "MANAGER_COST_PRICES"],
                    true
                  )}
                  path="/products/all"
                  element={
                    <Suspense fallback={<Loading loading={false} />}>
                      <ListProducts />
                    </Suspense>
                  }
                />
                <Route
                  path="/products/sales_categories"
                  element={
                    <Suspense fallback={<Loading loading={false} />}>
                      <ListSalesCategories />
                    </Suspense>
                  }
                />
                <Route
                  path="/products/general_categories"
                  element={
                    <Suspense fallback={<Loading loading={false} />}>
                      <ListStockCategories />
                    </Suspense>
                  }
                />
                <Route path="/products/cupons" element={<ListCoupons />} />
              </>
            )}
            <Route
              path="/products/sales"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListAllProductsReadyForSale />
                </Suspense>
              }
            />

            {module_booking && (
              <Route
                path="/products/resources"
                element={
                  <Suspense fallback={<Loading loading={false} />}>
                    <ListResource />
                  </Suspense>
                }
              />
            )}
          </>
        )}
        {/**Production Orders */}
        {allowRoles([
          "ADMIN",
          "CHIEF_PRODUCTION",
          "MANAGER_PRODUCTION",
          "MANAGER_COST_PRICES",
        ]) &&
          business?.configurationsKey.find(
            (itm) => itm.key === "module_production"
          )?.value === "true" && (
            <>
              <Route
                path="/orders"
                index={allowRoles(["CHIEF_PRODUCTION"], true)}
                element={
                  <Suspense fallback={<Loading loading={false} />}>
                    <ListProductionOrders />
                  </Suspense>
                }
              />
              <Route
                path="orders/recipes"
                element={
                  <Suspense fallback={<Loading loading={false} />}>
                    <ListRecipes />
                  </Suspense>
                }
              />
            </>
          )}
        {/**Economic Cycles */}
        {allowRoles([
          "ADMIN",
          "MANAGER_ECONOMIC_CYCLE",
          "MANAGER_SHIFT",
          "MANAGER_SALES",
          "ANALYSIS_REPORT",
        ]) && (
          <>
            <Route
              path="/ecocycle"
              index={allowRoles(
                ["MANAGER_ECONOMIC_CYCLE", "MANAGER_SHIFT"],
                true
              )}
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListEcoCyclesPage />
                </Suspense>
              }
            />
            <Route
              path="/ecocycle/analysis"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <EconomicCyclesAnalysis />
                </Suspense>
              }
            />
            <Route path="/ecocycle/accounts" element={<OrdersEcoCycle />} />
            <Route
              path="/ecocycle/:ecoCycleId"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <DetailEcoCycleContainer />
                </Suspense>
              }
            />
          </>
        )}
        {/* Bank Account */}
        {allowRoles(["MANAGER_CONTABILITY", "ANALYSIS_REPORT"]) && (
          <>
            <Route
              index={allowRoles(["MANAGER_CONTABILITY"], true)}
              path="/bank_accounts"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListBankAccounts />
                </Suspense>
              }
            />
            <Route
              path="/bank_accounts/:bankAccountId"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <MainBankAccount />
                </Suspense>
              }
            />
            <Route
              path="/bank_accounts/reports"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <MainBankAccountReport />
                </Suspense>
              }
            />
            <Route
              path="/bank_accounts/lists"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListBalance />
                </Suspense>
              }
            />
          </>
        )}
        {/**Clients */}
        {allowRoles(["ADMIN", "MANAGER_SHOP_ONLINE", "MANAGER_CUSTOMERS"]) && (
          <>
            <Route
              path="/clients/all"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <OnlineClientsContainer />
                </Suspense>
              }
            />
            <Route
              path="/clients/categories"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListCustomerCategory />
                </Suspense>
              }
            />
            <Route
              path="/clients/:clientId"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <DetailOnlineClientContainer />
                </Suspense>
              }
            />
          </>
        )}
        {/**Human Resourses */}
        {allowRoles(["ADMIN", "MANAGER_HUMAN_RESOURCES"]) && (
          <>
            <Route
              path="/human_resources/users"
              index={allowRoles(["MANAGER_HUMAN_RESOURCES"], true)}
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListUsers />
                </Suspense>
              }
            />
            <Route
              path="/human_resources/people"
              index={allowRoles(["MANAGER_HUMAN_RESOURCES"], true)}
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListPeople />
                </Suspense>
              }
            />
            <Route
              path="/human_resources/categories"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListCategories />
                </Suspense>
              }
            />
            <Route
              path="/human_resources/post"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListPost />
                </Suspense>
              }
            />
            <Route
              path="/human_resources/access"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <AttendanceRecord />
                </Suspense>
              }
            />
          </>
        )}

        {/*Salarios*/}
        {allowRoles(["ADMIN", "MANAGER_SALARY_RULES"]) && (
          <>
            <Route
              path="/salary/generator"
              index={allowRoles(["MANAGER_SALARY_RULES"], true)}
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <Generator />
                </Suspense>
              }
            />

            <Route
              path="/salary/rules"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListRules />
                </Suspense>
              }
            />
            <Route
              path="/salary/historical"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <Historical />
                </Suspense>
              }
            />
            <Route
              path="/salary/historical/:historicalName/:historicalID"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <HistoricalDetails />
                </Suspense>
              }
            />
          </>
        )}

        {/**Suppliers */}
        {business?.configurationsKey.find(
          (itm) => itm.key === "visual_suppliers"
        )?.value === "true" &&
          allowRoles(["ADMIN", "MANAGER_SUPPLIERS"]) && (
            <>
              <Route
                path="/suppliers"
                element={
                  <Suspense fallback={<Loading loading={false} />}>
                    <ListSuppliers />
                  </Suspense>
                }
              />
              <Route
                path="/suppliers/:supplierId"
                element={
                  <Suspense fallback={<Loading loading={false} />}>
                    <DetailSupplier />
                  </Suspense>
                }
              />
            </>
          )}
        {/**Billing */}
        {business?.configurationsKey.find((itm) => itm.key === "module_billing")
          ?.value === "true" &&
          allowRoles([
            "ADMIN",
            "MANAGER_SALES",
            "MANAGER_SHIFT",
            "MANAGER_BILLING",
            "MARKETING_SALES",
          ]) && (
            <>
              <Route path="/billing/resume" element={<BillingSummary />} />
              <Route path="/billing/registers" element={<AllRegistersList />} />
              <Route
                path="/billing/overdue_payments"
                element={<OverduePayments />}
              />
              <Route path="/billing/prepaid" element={<AllPrepaidList />} />
              {allowRoles([
                "ADMIN",
                "OWNER",
                "MANAGER_BILLING",
                "ANALYSIS_REPORT",
              ]) && (
                <Route path="/billing/analysis" element={<BillingAnalysis />} />
              )}
            </>
          )}
        {/**Reservation */}
        {business?.configurationsKey.find((itm) => itm.key === "module_booking")
          ?.value === "true" && (
          <>
            <Route
              path="/reservation/calendar"
              element={<CalendarReservation />}
            />
            <Route path="/reservation/all" element={<AllReservations />} />
            {/* <Route
                path="/reservation/analysis"
                element={<ReservationSummary/>}
              /> */}
            <Route
              path="/reservation/adjustment"
              element={<ReservationSettingsMain />}
            />
          </>
        )}
        {/**Análisis */}
        {allowRoles(["ADMIN", "ANALYSIS_REPORT"]) && (
          <>
            {/* <Route path="/analysis/balance_sheet" element={<BalanceSheet />} /> */}
            {/* <Route
              path="/analysis"
              element={<ReportsSalesByProducts />}
            /> */}
            <Route path="/reports" element={<AllReports />} />
          </>
        )}
        {/**Store */}
        {allowRoles(["ADMIN", "MANAGER_SHOP_ONLINE"]) && (
          <>
            <Route
              index={allowRoles(["MANAGER_SHOP_ONLINE"], true)}
              path="/online_shop"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListAllOrders />
                </Suspense>
              }
            />
          </>
        )}
        {/* Cartelera digital */}
        <Route
          index={allowRoles(["MANAGER_SHOP_ONLINE"], true)}
          path="/cart_digital"
          element={
            <Suspense fallback={<Loading loading={false} />}>
              <CartDigital />
            </Suspense>
          }
        />
        {/**Configurations */}
        {allowRoles([
          "ADMIN",
          "MANAGER_COST_PRICES",
          "MANAGER_CURRENCIES",
          "MANAGER_CONFIGURATIONS",
          "MANAGER_SALES",
          "MANAGER_SHIFT",
        ]) && (
          <>
            <Route
              path="/configurations/my_business"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <MyBusiness />
                </Suspense>
              }
            />
            <Route
              path="/configurations/my_areas"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <ListAreas />
                </Suspense>
              }
            />
            <Route
              path="/configurations/my_areas/:areaId"
              element={
                <Suspense fallback={<Loading loading={false} />}>
                  <DetailAreaContainer />
                </Suspense>
              }
            />
            <Route path="/configurations/regions" element={<RegionConfig />} />

            <Route path="/configurations/generals" element={<ConfigMain />} />
            <Route
              path="configurations/pricessystem"
              element={<PriceSystemConfig />}
            />
            <Route path="configurations/fixedcosts" element={<FixedCosts />} />
            <Route
              path="/configurations/currencies"
              element={<CurrenciesConfig />}
            />
          </>
        )}
        {/**Cartelera Digital */}
        {allowRoles([
          "ADMIN",
          "MANAGER_COST_PRICES",
          "MANAGER_CURRENCIES",
          "MANAGER_CONFIGURATIONS",
          "MANAGER_SALES",
          "MANAGER_SHIFT",
        ]) && (
          <Route
            path="/digital_billboard"
            element={
              <Suspense fallback={<Loading loading={false} />}>
                <CartDigital />
              </Suspense>
            }
          />
        )}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default PayedRoute;
