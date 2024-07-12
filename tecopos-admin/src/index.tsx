import "./index.css";
import reportWebVitals from "./reportWebVitals";
import { Provider } from "react-redux";
import { store, persistor } from "./store/root";
import { MainRouter } from "./routes/MainRouter";
import { createRoot } from "react-dom/client";
import { PersistGate } from "redux-persist/integration/react";
import Loading from "./components/misc/Loading";
import { injectStore } from "./api/APIServices";
import { injectMediaStore } from "./api/APIMediaServer";
// import 'react-tooltip/dist/react-tooltip.css'

injectStore(store);
injectMediaStore(store)

const business = process.env.REACT_APP_BUSINESS;

const favicon = document.getElementById("favicon");

if (business === "acenna") {
  favicon?.setAttribute("href", "/Acenna2.gif");
  document.title = "Aceña";
} else {
  favicon?.setAttribute("href", "/logo192.png");
  document.title = "TECOPOS";
}

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <PersistGate persistor={persistor} loading={<Loading />}>
      <MainRouter />
    </PersistGate>
  </Provider>
);

reportWebVitals();
