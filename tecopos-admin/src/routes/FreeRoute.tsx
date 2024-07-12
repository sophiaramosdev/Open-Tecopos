import { Routes, Route } from "react-router-dom";
import {
  HomePagePlanFree,
} from "../pages";
import NotFoundPage from "../pages/NotFoundPage";
import FreeAppContainer from "../containers/FreeAppContainer";
import ListAllProductsReadyForSale from "../containers/products/ListAllProductsReadyForSale";
import ListSalesCategories from "../containers/products/ListSalesCategories";
import MyBusiness from "../containers/config/MyBusiness";
import StoreGalery from "../containers/store/StoreGalery";

const FreeRoute = () => {
  return (
    <Routes>
      <Route path="/" element={<FreeAppContainer />}>
        {/**Home */}
        <Route index element={<HomePagePlanFree link="inicio" />} />
        {/**Stocks */}
        <Route path="/stocks" element={<HomePagePlanFree link="stocks" />} />
        <Route path="/stocks/dispatches" element={<HomePagePlanFree link="dispatches" />} />
        <Route path="/stocks/analysis" element={<HomePagePlanFree link="stocks" />} />
        {/**Products */}
        <Route
          path="/products/all"
          element={<HomePagePlanFree link="products" />}
        />
        <Route path="/products/sales" element={<ListAllProductsReadyForSale />} />
        <Route
          path="/products/sales_categories"
          element={<ListSalesCategories />}
        />
        <Route
          path="/products/general_categories"
          element={<HomePagePlanFree link="products" />}
        />
        {/**Ciclos económicos */}
        <Route
          path="/ecocycle"
          element={<HomePagePlanFree link="ecocycle" />}
        />
        {/**Usuarios */}
        <Route
          path="/users"
          element={<HomePagePlanFree link="users" />}
        />
        {/**Clientes */}
        <Route
          path="/clients"
          element={<HomePagePlanFree link="clients" />}
        />
        <Route path="/store/galery" element={<StoreGalery />} />
        <Route
          path="/configurations/my_business"
          element={<MyBusiness />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default FreeRoute;
