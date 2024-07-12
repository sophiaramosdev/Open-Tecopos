import {
  faCashRegister,
  faTv,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import useServerProduct from "../../api/useServerProducts";
import ProductTypeBadge from "../../components/misc/badges/ProductTypeBadge";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Paginate from "../../components/misc/Paginate";
import ScrollTypeFilter from "../../components/misc/ScrollTypeFilter";
import Modal from "../../components/modals/GenericModal";
import DetailProductContainer from "./DetailProductContainer";
import NewWizardContainer from "./newProductModal/NewWizardContainer";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../store/hooks";
import { translateMeasure } from "../../utils/translate";
import UnlimitedBadge from "../../components/misc/badges/UnlimitedBadge";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { BsFiletypeXlsx } from "react-icons/bs";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../components/forms/Input";
import Button from "../../components/misc/Button";
import { CurrencyInterface } from "../../interfaces/ServerInterfaces";
import { productTypes } from "../../utils/staticData";
import { Tooltip as ReactTooltip } from "react-tooltip";
import useServer from "../../api/useServerMain";
import useProduct from "../../hooks/useProduct";

export default function ListAllProductsReadyForSale() {
  const [showModal, setShowModal] = useState(false);
  const [newProdModal, setNewProdModal] = useState(false);
  const initFilter = {
    page: 1,
    type: "MENU,STOCK,SERVICE,VARIATION,COMBO,ADDON",
  };
  const [filter, setFilter] =
    useState<Record<string, string | number | boolean | null>>(initFilter);

  const [exportModal, setExportModal] = useState(false);

  const {
    allProducts,
    paginate,
    product,
    outLoading,
    isFetching,
    getProduct,
    addProduct,
    updateProduct,
    manageManufacturer,
    manageSupplies,
    deleteProduct,
    getAllProducts,
    updateVariationState,
    isLoading,
    priceSystem,
    manageCombos,
  } = useServerProduct();
  
  const {
    updateFixedCostState,    
    updateAttributeState,
    productRecords,
    getRecordsProduct,
    paginateRecords,
    isFetchingB,
  } = useServerProduct();

  const productCrud = {
    updateProduct,
    deleteProduct,
    manageManufacturer,
    manageSupplies,
    updateVariationState,
    isFetching,
    manageCombos,
    updateFixedCostState,
    updateAttributeState,
    productRecords,
    getRecordsProduct,
    paginateRecords,
    isLoading,
    isFetchingB,
  };

  const { salesCategories, measures } = useAppSelector(
    (state) => state.nomenclator
  );
  const { business } = useAppSelector((state) => state.init);
  const { availableCurrencies: allCurrencies } = business!;
  const { allowRoles: verifyRoles } = useServer();
  const { getPrice, getCost, getProfit } = useProduct();

  useEffect(() => {
    getAllProducts(filter);
  }, [filter]);

  //Data to display in Table-----------------------------------------------------
  //Action after click in RowTable
  const rowAction = !verifyRoles(["MARKETING_SALES"], true)
    ? (id: string) => {
        getProduct(id);
        setShowModal(true);
      }
    : undefined;

  //Data to display in Table------------------------------------------------------
  let titles: string[] = [
    "Nombre",
    "Costo",
    "Precio de venta",
    "Ganancia",
    "Disponibilidad",
    "",
    "Tipo",
  ];

  const actions: BtnActions[] = [
    {
      title: "Añadir Producto",
      action: () => setNewProdModal(true),
      icon: <PlusIcon className="h-5" />,
    },
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  if (!verifyRoles(["MANAGER_CONTABILITY", "ADMIN", "MANAGER_COST_PRICES"])) {
    titles = titles.filter((elemento) => elemento !== "Costo");
    titles = titles.filter((elemento) => elemento !== "Ganancia");
    actions.length = 0;
  }
  const productDisplay: Array<DataTableInterface> = [];
  allProducts.forEach((item) => {

    const quantityByGroup: (quantity: number) => React.ReactElement | void = (
      quantity
    ) => {
      if (!!item?.enableGroup) {
        const rest = quantity % item.groupConvertion;
        return (
          <div className="flex-col">
            <div>
              {`${Math.trunc(quantity / item.groupConvertion)} ${
                item.groupName
              }`}
            </div>
            {rest !== 0 && (
              <p>{"(+" + rest + translateMeasure(item.measure) + ")"}</p>
            )}
          </div>
        );
      }
    };

    productDisplay.push({
      rowId: item.id,
      payload: {
        Nombre: (
          <div className="inline-flex items-center gap-1">
            <span
              className={`w-2 h-2  rounded-full ${
                item.stockLimit &&
                item.alertLimit &&
                item.totalQuantity < item.alertLimit
                  ? "animate-pulse bg-red-500"
                  : ""
              }`}
            />
            {item?.name}
          </div>
        ),
        Costo: getCost({ product: item, setPrecision: true }),
        "Precio de venta": getPrice({ product: item }) as string,
        Ganancia: (() => {
          const profit = getProfit({ product: item, priceSystemId: priceSystem?.id, mode:"price" });
          const percent = getProfit({ product: item, priceSystemId: priceSystem?.id, mode:"percent" });
          return (
            <div className="flex items-center justify-center">
              <p>
                {profit}
              </p>

              <p className="ml-2">
                ({percent + "%"})
              </p>

              {percent as number > 0 ? (
                <ArrowUpIcon className="text-green-600 w-3" />
              ) : (
                <ArrowDownIcon className="text-red-600 w-3" />
              )}
            </div>
          );
        })(),

        Disponibilidad: (
          <div className="flex-col">
            <div className="text-xs font-semibold">
              {quantityByGroup(item.totalQuantity) ?? (
                <div>
                  {item.stockLimit ? (
                    `${item.totalQuantity} ${translateMeasure(item?.measure)}`
                  ) : (
                    <UnlimitedBadge />
                  )}
                </div>
              )}
            </div>
          </div>
        ),
        "": (
          <IconPublic
            showForSale={item.showForSale}
            isPublicVisible={item.isPublicVisible}
            visibleOnline={item.visibleOnline}
          />
        ),
        Tipo: (
          <div>
            <ProductTypeBadge type={item.type} />
          </div>
        ),
      },
    });
  });

  //Data for Filter Scroll -------------------------------------------------
  let categoriesDisplay: SelectInterface[] = [];
  salesCategories.map((item) =>
    categoriesDisplay.push({ id: item.id, name: item.name })
  );

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis Productos",
    },
    { name: "Carta de venta" },
  ];
  //------------------------------------------------------------------------------------

  //Filtros ------------------------------------------------------------------------
  const measureSelectorData: SelectInterface[] =
    measures.map((item) => ({ id: item.code, name: item.value })) ?? [];
  const productTypeSelector: SelectInterface[] =
    productTypes.map((item) => ({ id: item.id, name: item.name })) ?? [];
  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "input",
      filterCode: "disponibilityFrom",
      name: "Cantidad disponible desde",
    },
    {
      format: "input",
      filterCode: "disponibilityFrom",
      name: "Cantidad disponible hasta",
    },
    {
      format: "select",
      filterCode: "measure",
      name: "Unidad de medida",
      data: measureSelectorData,
    },
    {
      format: "multiselect",
      filterCode: "type",
      name: "Tipo de producto",
      data: productTypeSelector,
    },
    {
      format: "boolean",
      filterCode: "suggested",
      name: "Sugeridos",
    },
    {
      format: "boolean",
      filterCode: "onSale",
      name: "En rebaja",
    },
    {
      format: "boolean",
      filterCode: "isPublicVisible",
      name: "Visibles en carta de venta",
    },
    {
      format: "boolean",
      filterCode: "showWhenOutStock",
      name: "Mostrando estando agotados",
    },
    {
      format: "boolean",
      filterCode: "showRemainQuantities",
      name: "Mostrando cantidades disponibles",
    },
    {
      format: "boolean",
      filterCode: "isUnderAlertLimit",
      name: "Cantidad inferior al límite de alerta",
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };

  //---------------------------------------------------------------------------------

  const searching = {
    action: (search: string | null) =>
      setFilter(search ? { search } : { page: 1 }),
    placeholder: "Buscar Producto",
  };

  return (
    <>
      <Breadcrumb
        icon={<ShoppingBagIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <ScrollTypeFilter
        title="Categorías de ventas"
        items={categoriesDisplay}
        current={Number(filter?.salesCategoryId) ?? null}
        onChange={(item: string | number | null) =>
          setFilter({
            ...filter,
            salesCategoryId: item,
          })
        }
      />

      <GenericTable
        tableTitles={titles}
        tableData={productDisplay}
        actions={actions.length !== 0 ? actions : undefined}
        rowAction={rowAction}
        loading={outLoading}
        searching={searching}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />
      <ReactTooltip place="top" id="my-tooltip" />

      {showModal && (
        <Modal state={showModal} close={setShowModal} size="l">
          <DetailProductContainer
            closeModal={() => setShowModal(false)}
            crud={productCrud}
            loading={isLoading}
            product={product}
          />
        </Modal>
      )}

      {newProdModal && (
        <Modal state={newProdModal} close={setNewProdModal} size="m">
          <NewWizardContainer
            action={addProduct}
            closeModal={() => setNewProdModal(false)}
            loading={isFetching}
          />
        </Modal>
      )}

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            filter={filter}
            closeModal={() => setExportModal(false)}
            allCurrencies={allCurrencies}
          />
        </Modal>
      )}
    </>
  );
}

function IconPublic(props: any) {
  const { showForSale, isPublicVisible, visibleOnline } = props;

  return (
    <div className="flex items-center justify-around w-20">
      <div
        data-tooltip-id="my-tooltip"
        data-tooltip-content={
          showForSale ? "Para la venta" : "No para la venta"
        }
        className="tooltip"
      >
        {showForSale ? (
          <FontAwesomeIcon
            //@ts-ignore
            icon={faCashRegister}
            className="text-orange-400"
          />
        ) : (
          <FontAwesomeIcon
            //@ts-ignore
            icon={faCashRegister}
            className="text-gray-700"
          />
        )}
      </div>

      <div
        data-tooltip-id="my-tooltip"
        data-tooltip-content={
          isPublicVisible ? "Visible al público" : "No visible al público"
        }
        className="tooltip"
      >
        {isPublicVisible ? (
          <FontAwesomeIcon
            //@ts-ignore
            icon={faTv}
            className="text-orange-400"
          />
        ) : (
          <FontAwesomeIcon
            //@ts-ignore
            icon={faTv}
            className="text-gray-700"
          />
        )}
      </div>

      <div
        data-tooltip-id="my-tooltip"
        data-tooltip-content={
          visibleOnline ? "Visible en internet" : "No visible en internet"
        }
        className="tooltip"
      >
        {visibleOnline ? (
          <FontAwesomeIcon
            //@ts-ignore
            icon={faGlobe}
            className="text-orange-400"
          />
        ) : (
          <FontAwesomeIcon
            //@ts-ignore
            icon={faGlobe}
            className="text-gray-700"
          />
        )}
      </div>
    </div>
  );
}

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
  allCurrencies: CurrencyInterface[];
}

const ExcelFileExport = ({
  filter,
  closeModal,
  allCurrencies,
}: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportProductForSale, isLoading } = useServerProduct();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportProductForSale(filter, data.name, allCurrencies, closeModal());
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        name="name"
        label="Nombre del archivo"
        placeholder="Nombre del archivo .xlsx"
        control={control}
        rules={{ required: "Debe indicar un nombre para el archivo" }}
      />
      <div className="flex py-2 justify-end">
        <Button
          type="submit"
          name="Exportar"
          color="slate-600"
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </form>
  );
};
