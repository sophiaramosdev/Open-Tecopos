import { useState, createContext, useEffect, useMemo } from "react";
import Details from "./productDetails/Details";
import ProductTypeBadge from "../../components/misc/badges/ProductTypeBadge";
import SpinnerLoading from "../../components/misc/SpinnerLoading";
import {
  PaginateInterface,
  ProductInterface,
  ProductRecordsInterface,
} from "../../interfaces/ServerInterfaces";
import Disponibility from "./productDetails/Disponibility";
import Ficha from "./productDetails/Ficha";
import Processed from "./productDetails/Processed";
import Opperations from "./productDetails/Opperation";
import Setting from "./productDetails/Setting";
import Combos from "./productDetails/Combos";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxesStacked,
  faClipboardList,
  faArrowRightArrowLeft,
  faCashRegister,
  faGears,
  faLayerGroup,
  faCubes,
  faObjectUngroup,
  faClipboardCheck,
  faCartShopping,
  faListCheck,
} from "@fortawesome/free-solid-svg-icons";
import Fetching from "../../components/misc/Fetching";
import {
  FaBoxOpen,
  FaCompressArrowsAlt,
  FaDumpsterFire,
  FaPuzzlePiece,
} from "react-icons/fa";
import Dependencies from "./productDetails/Dependencies";
import Attributes from "./productDetails/Attributes";
import Variations from "./productDetails/Variations";
import { useAppSelector } from "../../store/hooks";
import { RecordsProduct } from "./productDetails/RecordsProduct";
import SideNav, { TabsAttr } from "../../components/misc/SideNav";
import Promotions from "./productDetails/Promotions";
import Sales_Resume from "./productDetails/Sales_Resume";
import Sales_Price from "./productDetails/Sales_Price";
import useServer from "../../api/useServerMain";
import Resources from "./productDetails/Resources";
import Addon from "./productDetails/Addon";
import { GiHammerBreak } from "react-icons/gi";
import Descomposition from "./productDetails/Descomposition";

interface ProdCtx {
  product: ProductInterface | null;
  updateProduct: Function;
  deleteProduct: Function;
  manageSupplies: Function;
  manageCombos: Function;
  manageManufacturer: Function;
  isFetching: boolean;
  updateStockProductState: Function;
  updateFixedCostState: Function;
  updateAttributeState: Function;
  updateVariationState: Function;
  productRecords?: ProductRecordsInterface[] | null;
  getRecordsProduct?: Function;
  paginateRecords?: PaginateInterface | null;
  isFetchingB?: boolean;
  closeModal?: Function;
}

const detailProdContext: Partial<ProdCtx> = {};

export const DetailProductContext = createContext(detailProdContext);

interface Detail {
  product: ProductInterface | null;
  loading: boolean;
  crud: {
    updateProduct: Function;
    deleteProduct?: Function;
    manageCombos?: Function;
    manageSupplies?: Function;
    manageManufacturer: Function;
    updateFixedCostState?: Function;
    isFetching: boolean;
    updateStockProductState?: Function;
    updateAttributeState?: Function;
    updateVariationState: Function;
    productRecords?: ProductRecordsInterface[] | null;
    getRecordsProduct?: Function;
    paginateRecords?: PaginateInterface | null;
    isFetchingB?: boolean;
  };
  closeModal: Function;
}

const DetailProductContainer = ({
  product,
  loading,
  crud,
  closeModal,
}: Detail) => {
  //Manage Tabs --------------------------------------------------------------------------------------------------
  const [currentTab, setCurrentTab] = useState("details");
  const { allowRoles: verifyRoles } = useServer();
  const { business } = useAppSelector((state) => state.init);

  const module_booking =
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true";

  //Tabs ----------------------------------------------------------
  const roleIsAdmin = verifyRoles(["ADMIN", "PRODUCT_PROCESATOR"]);
  const isManagerCost = verifyRoles(["MANAGER_COST_PRICES"]);
  const isAreaManager = verifyRoles(["MANAGER_AREA"], true);
  const tabs: TabsAttr[] = [
    {
      icon: <FaBoxOpen />,
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      icon: <FontAwesomeIcon icon={faBoxesStacked} />,
      name: "Disponibilidad",
      href: "dispo",
      current: currentTab === "dispo",
    },
  ];
  //Combos
  if (["COMBO"].includes(product?.type ?? ""))
    tabs.push({
      icon: <FontAwesomeIcon icon={faCubes} />,
      name: "Compuestos",
      href: "compounds",
      current: currentTab === "compounds",
      disabled: isAreaManager,
    });
  //Atributos
  if (["VARIATION"].includes(product?.type ?? "")) {
    tabs.push({
      icon: <FaPuzzlePiece />,
      name: "Atributos",
      href: "attribute",
      current: currentTab === "attribute",
      disabled: isAreaManager,
    });
  }
  //Variaciones
  if (
    ["VARIATION"].includes(product?.type ?? "") &&
    product?.attributes?.length !== 0
  ) {
    tabs.push({
      icon: <FontAwesomeIcon icon={faObjectUngroup} />,
      name: "Variaciones",
      href: "variations",
      current: currentTab === "variations",
      disabled: isAreaManager,
    });
  }
  //Procesado
  if (
    ["MENU", "ADDON", "STOCK", "COMBO"].includes(
      product?.type ?? ""
    )
  )
    tabs.push({
      icon: <FaDumpsterFire />,
      name: "Procesado",
      href: "proc",
      current: currentTab === "proc",
      disabled: isAreaManager,
    });

  //Descomposition
  if (
    ["MANUFACTURED", "RAW", "STOCK"].includes(
      product?.type ?? ""
    )
  )
    tabs.push({
      icon: <GiHammerBreak />,
      name: "Descomposición",
      href: "descomp",
      current: currentTab === "descomp",
      disabled: isAreaManager,
    });

  //Ficha de costo
  if (["MANUFACTURED", "MENU", "STOCK", "ADDON", "SERVICE"].includes(product?.type ?? ""))
    tabs.push({
      icon: <FontAwesomeIcon icon={faClipboardList} />,
      name: "Ficha de costo",
      href: "ft",
      current: currentTab === "ft",
      disabled: !roleIsAdmin && !isManagerCost,
    });
  //Dependencias
  if (["RAW", "MANUFACTURED", "STOCK", "WASTE"].includes(product?.type ?? ""))
    tabs.push({
      icon: <FaCompressArrowsAlt className="font-bold" />,
      name: "Dependencias",
      href: "dep",
      current: currentTab === "dep",
      disabled: isAreaManager,
    });
  //Agregos
  if (["MENU"].includes(product?.type ?? ""))
    tabs.push({
      icon: <FontAwesomeIcon icon={faLayerGroup} />,
      name: "Agregos",
      href: "agg",
      current: currentTab === "agg",
      disabled: isAreaManager,
    });
  //Agregos || Recursos para module_booking activo
  if (["SERVICE"].includes(product?.type ?? "") && module_booking)
    tabs.push({
      icon: <FontAwesomeIcon icon={faLayerGroup} />,
      name: "Recursos",
      href: "rec",
      current: currentTab === "rec",
    });
  //Operaciones
  if (
    ["STOCK", "MANUFACTURED", "RAW", "ASSET", "VARIATION"].includes(
      product?.type ?? ""
    )
  )
    tabs.push({
      icon: <FontAwesomeIcon icon={faArrowRightArrowLeft} />,
      name: "Operaciones",
      href: "opp",
      current: currentTab === "opp",
      disabled: !roleIsAdmin && !isAreaManager,
    });
  //Ventas y ordenes asociadas
  if (
    ["STOCK", "MENU", "ADDON", "SERVICE", "VARIATION", "COMBO"].includes(
      product?.type ?? ""
    )
  )
    tabs.push(
      {
        icon: <FontAwesomeIcon icon={faCashRegister} />,
        name: "Ventas",
        href: "sales",
        current: currentTab === "sales",
        disabled: isAreaManager,
      },
      {
        icon: <FontAwesomeIcon icon={faListCheck} />,
        name: "Órdenes asociadas",
        href: "orders",
        current: currentTab === "orders",
        disabled: !roleIsAdmin,
      }
    );
  // Trazas
  tabs.push({
    icon: <FontAwesomeIcon icon={faClipboardCheck} />,
    name: "Trazas",
    href: "trazas",
    current: currentTab === "trazas",
    disabled: isAreaManager,
  });
  //Promociones
  ["STOCK", "MENU", "ADDON", "SERVICE", "VARIATION", "COMBO"].includes(
    product?.type ?? ""
  ) &&
    tabs.push({
      icon: <FontAwesomeIcon icon={faCartShopping} />,
      name: "Promociones",
      href: "promo",
      current: currentTab === "promo",
      disabled: isAreaManager,
    });

  //Ajustes
  tabs.push({
    icon: <FontAwesomeIcon icon={faGears} />,
    name: "Ajustes",
    href: "adj",
    current: currentTab === "adj",
    disabled: !roleIsAdmin,
  });
  //--------------------------------------------------------------------------------------------------------
  if (loading)
    return (
      <div className="h-96 flex items-center justify-center">
        <SpinnerLoading />
      </div>
    );

  const {
    updateProduct,
    manageSupplies,
    manageCombos,
    deleteProduct,
    manageManufacturer,
    isFetching,
    updateStockProductState,
    updateFixedCostState,
    updateAttributeState,
    updateVariationState,
    productRecords,
    getRecordsProduct,
    paginateRecords,
    isFetchingB,
  } = crud;
  if (product) {
    return (
      <div className="h-full">
        <div className="inline-flex gap-5">
          <h2 className="text-lg text-gray-700 font-medium">{product?.name}</h2>
          <ProductTypeBadge type={product?.type ?? ""} />
        </div>

        <DetailProductContext.Provider
          value={{
            product,
            updateProduct,
            manageSupplies,
            manageCombos,
            manageManufacturer,
            deleteProduct,
            isFetching,
            updateStockProductState,
            updateFixedCostState,
            updateAttributeState,
            updateVariationState,
            productRecords,
            getRecordsProduct,
            paginateRecords,
            isFetchingB,
            closeModal,
          }}
        >
          <div className="grid grid-cols-12 gap-2 h-[40rem] mt-3">
            <div className="col-span-2 p-2 pt-0">
              <SideNav tabs={tabs} action={setCurrentTab} />
            </div>
            <div className="col-span-10 h-full">
              {isFetching && <Fetching />}
              {currentTab === "details" && <Details />}
              {currentTab === "compounds" && <Combos />}
              {currentTab === "attribute" && <Attributes />}
              {currentTab === "variations" && <Variations />}
              {currentTab === "dispo" && <Disponibility />}
              {currentTab === "ft" && <Ficha />}
              {currentTab === "dep" && <Dependencies />}
              {currentTab === "proc" && <Processed />}
              {currentTab === "descomp" && <Descomposition />}
              {currentTab === "agg" && <Addon />}
              {currentTab === "rec" && <Resources />}
              {currentTab === "opp" && <Opperations />}
              {currentTab === "sales" && <Sales_Price />}
              {currentTab === "trazas" && <RecordsProduct />}
              {currentTab === "promo" && <Promotions />}
              {currentTab === "orders" && <Sales_Resume />}
              {currentTab === "adj" && <Setting closeModal={closeModal} />}
            </div>
          </div>
        </DetailProductContext.Provider>
      </div>
    );
  } else {
    return (
      <div className="h-96 flex items-center justify-center">
        <p>¡A ocurrido un error!</p>
      </div>
    );
  }
};

export default DetailProductContainer;
