import { useState, useEffect, useMemo } from "react";
import { useAppSelector } from "../../../../store/hooks";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../../components/misc/GenericTable";
import { useParams } from "react-router";
import useServerProduct from "../../../../api/useServerProducts";
import useServerSupplier from "../../../../api/useServerSupplier";
import Paginate from "../../../../components/misc/Paginate";
import { cleanObj, formatCurrency } from "../../../../utils/helpers";
import ProductTypeBadge from "../../../../components/misc/badges/ProductTypeBadge";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import {
  FixedCost,
  SuppliesInterface,
} from "../../../../interfaces/ServerInterfaces";
import Modal from "../../../../components/modals/GenericModal";
import useServerArea from "../../../../api/useServerArea";
import { translateMeasure } from "../../../../utils/translate";
import { productTypes } from "../../../../utils/staticData";
import DetailProductContainer from "../../../../containers/products/DetailProductContainer";

import { BasicType } from "../../../../interfaces/InterfacesLocal";
import { BsFiletypeXlsx } from "react-icons/bs";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import WizzardContainer from "../movements/newMovementWizzard/WizzardContainer";
import UnlimitedBadge from "../../../../components/misc/badges/UnlimitedBadge";
import useServer from "../../../../api/useServerMain";

const StockProductContainer = () => {
  const { stockId } = useParams();
  const { business } = useAppSelector((state) => state.init);
  const { productCategories } = useAppSelector((state) => state.nomenclator);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean | null>
  >({ page: 1 });
  const {
    getProduct,
    product,
    updateProduct,
    deleteProduct,
    manageSupplies,
    manageManufacturer,
    updateFixedCostState,
    updateVariationState,
    isLoading: loadingProduct,
    isFetching,
  } = useServerProduct();

  const { allSuppliers, getAllSuppliers } = useServerSupplier();

  const {
    paginate,
    updateStockProductState,
    addMovement,
    stockProducts,
    getStockAreaData,
    exportStockProducts,
    isLoading,
    isFetching: fetching,
  } = useServerArea();

  const crudProduct = {
    updateProduct,
    deleteProduct,
    manageSupplies,
    updateFixedCostState,
    manageManufacturer,
    updateVariationState,
    isFetching,
    updateStockProductState,
  };

  const { allowRoles: verifyRoles } = useServer();

  useEffect(() => {
    stockId && getStockAreaData(stockId, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    getAllSuppliers({ all_data: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { measures } = useAppSelector((state) => state.nomenclator);
  let measuresOpt = measures.map((elem) => ({
    id: elem.code,
    name: elem.value,
  }));

  const [newOppModal, setNewOppModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);

  const precission = Number(
    business?.configurationsKey.find(
      (item) => item.key === "precission_after_coma"
    )?.value
  );

  //Management filters ------------------------------------------------------------------------
  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "select",
      filterCode: "productCategoryId",
      name: "Categorías de almacén",
      data: productCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
      })),
    },
    {
      format: "multiselect",
      filterCode: "type",
      name: "Tipo de producto",
      data: productTypes.filter(
        (type) => !["ADDON", "SERVICE", "MENU"].includes(type.id)
      ),
    },
    {
      format: "boolean",
      filterCode: "isUnderAlertLimit",
      name: "Cantidad inferior al límite de alerta",
    },
    {
      format: "select",
      filterCode: "supplierId",
      name: "Proveedor",
      data: allSuppliers,
    },
    {
      format: "select",
      filterCode: "measure",
      name: "Unidad de Medida",
      data: measuresOpt,
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ all_data: true, ...data }) : setFilter({ page: 1 });
  };

  //--------------------------------------------------------------------------------------------------------

  //Calculate cost --------------------------------------------------------------------------------------
  const productCost = (
    avCost: number,
    supplies: SuppliesInterface[],
    fixedCost: FixedCost[],
    type?: string
  ) => {
    if (
      ["MANUFACTURED", "MENU", "STOCK", "ADDON"].includes(type ?? "") &&
      (supplies.length !== 0 || fixedCost.length !== 0)
    ) {
      return (
        supplies.reduce(
          (total, value) => total + value.quantity * value.supply.averageCost,
          0
        ) + fixedCost.reduce((total, item) => total + item.costAmount, 0)
      );
    } else {
      return avCost;
    }
  };
  //-------------------------------------------------------------------------------------------------------

  //Data to display in Table----------------------------------------------------------------
  //Action after click in RowTable
  const action = (id: string) => {
    getProduct(id);
    setShowModal(true);
  };

  //Data to display-------------------------------------------------
  const limitCosts = !verifyRoles(["MANAGER_COST_PRICES","ADMIN"]);

  let titles: string[] = [
    "Nombre",
    "Disponibilidad",
    "Costo total",
    "Venta estimada",
    "Tipo",
  ];

  if (limitCosts) {
    titles = titles.filter(
      (elemento) =>
        [
          "Nombre",
          "Disponibilidad",
          "Tipo"
        ].includes(elemento)
    );
  }

  const productDisplay: DataTableInterface[] = useMemo(() => {
    const products: Array<DataTableInterface> = [];
    stockProducts.forEach((item) => {
      const unitCost: number = productCost(
        item?.product?.averageCost ?? 0,
        item?.product?.supplies ?? [],
        item.product?.fixedCosts ?? [],
        item?.product?.type
      );

      const quantityByGroup: (quantity: number) => React.ReactElement | void = (
        quantity
      ) => {
        if (!!item?.product.enableGroup) {
          const rest = quantity % item.product.groupConvertion;
          return (
            <div className="flex-col">
              <div>
                {`${Math.trunc(quantity / item.product.groupConvertion)} ${item.product.groupName
                  }`}
              </div>
              {rest !== 0 && (
                <p>
                  {"(+" + rest + translateMeasure(item.product.measure) + ")"}
                </p>
              )}
            </div>
          );
        }
      };
      products.push({
        rowId: item.product.id,
        payload: {
          Nombre: (
            <div className="inline-flex items-center gap-1">
              <span
                className={`w-2 h-2  rounded-full ${item.product.stockLimit &&
                  item.product.alertLimit &&
                  item.product.totalQuantity < item.product?.alertLimit
                  ? "animate-pulse bg-red-600"
                  : ""
                  }`}
              />
              {item?.product.name}
            </div>
          ),
          "Costo unitario": formatCurrency(
            unitCost,
            business?.costCurrency ?? "CUP",
            precission
          ),
          Disponibilidad: (
            <div className="flex-col">
              <div className="text-sm">
                {quantityByGroup(item.quantity) ?? (
                  <div>
                    {item.product.stockLimit ? (
                      `${item.quantity} ${translateMeasure(
                        item?.product.measure
                      )}`
                    ) : item.product.stockLimit === false ? (
                      <UnlimitedBadge />
                    ) : item.quantity ? (
                      `${item.quantity} ${translateMeasure(
                        item?.product.measure
                      )}`
                    ) : (
                      <UnlimitedBadge />
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
          Agrupación: quantityByGroup(item.quantity) ?? "-",
          "Costo total": formatCurrency(
            item.quantity * unitCost ?? 0,
            business?.costCurrency ?? "",
            precission
          ),
          "Venta estimada": (
            <div className="flex-col">
              {item.product.prices.map((elem, idx) => (
                <p key={idx}>
                  {formatCurrency(
                    elem.price * item.quantity,
                    elem.codeCurrency
                  )}
                </p>
              ))}
            </div>
          ),
          Tipo: <ProductTypeBadge type={item.product.type} />,
        },
        childRows:
          item.variations && item.variations.length !== 0
            ? item.variations.map((child) => ({
              payload: {
                Nombre: child.variation.name,
                "Costo unitario": "",
                Disponibilidad: `${child.quantity} ${translateMeasure(
                  item.product.measure
                )}`,
                "Costo total": "",
                Tipo: "",
              },
            }))
            : undefined,
      });
    });
    return products;
  }, [stockProducts]);

  const actions = [
    {
      title: "Nueva operación",
      action: () => setNewOppModal(true),
      icon: <ArrowsRightLeftIcon className="h-5" />,
    },
    {
      title: "Exportar a Excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  //---------------------------------------------------------------------------------------------

  //New Movement Modal Action -------------------------------------------------------------------------
  const newMovementAction = (type: string, data: Record<string, any>) =>
    addMovement(type, cleanObj(data), () => setNewOppModal(false));

  //------------------------------------------------------------------------------------------------------

  const exportFunction = (filename: string) => {
    exportStockProducts(stockId!, filename, filter, () =>
      setExportModal(false)
    );
  };

  return (
    <div>
      {/* <ReportsComponent report={report} isLoading={isLoading} /> */}
      <GenericTable
        tableTitles={titles}
        tableData={productDisplay}
        actions={actions}
        rowAction={action}
        loading={isLoading}
        filterComponent={{ availableFilters, filterAction }}
        searching={{
          action: (value: string | null) => {
            value !== null
              ? setFilter({ ...filter, search: value, page: null })
              : setFilter({ ...filter, search: value, page: 1 });
          },
          placeholder: "Buscar Producto",
        }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />

      {showModal && (
        <Modal state={showModal} close={setShowModal} size="l">
          <DetailProductContainer
            product={product}
            loading={loadingProduct}
            crud={crudProduct}
            closeModal={() => setShowModal(false)}
          />
        </Modal>
      )}

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport exportFunction={exportFunction} loading={fetching} />
        </Modal>
      )}

      {newOppModal && (
        <Modal state={newOppModal} close={setNewOppModal} size="m">
          {/*<NewMovementWizard action={newMovementAction} loading={fetching} />*/}
          <WizzardContainer action={newMovementAction} loading={fetching} />
        </Modal>
      )}
    </div>
  );
};

interface ExportContainer {
  exportFunction: Function;
  loading: boolean;
}

const ExcelFileExport = ({ exportFunction, loading }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { stockId } = useParams();
  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportFunction(data.name);
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
          loading={loading}
          disabled={loading}
        />
      </div>
    </form>
  );
};

export default StockProductContainer;
