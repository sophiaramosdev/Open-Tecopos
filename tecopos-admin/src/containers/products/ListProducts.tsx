/* eslint-disable react-hooks/exhaustive-deps */
import { PlusIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import useServerProduct from "../../api/useServerProducts";
import ProductTypeBadge from "../../components/misc/badges/ProductTypeBadge";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Paginate from "../../components/misc/Paginate";
import Modal from "../../components/modals/GenericModal";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import {
  CurrencyInterface,
  SupplierInterfaces,
} from "../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../store/hooks";
import DetailProductContainer from "./DetailProductContainer";
import NewWizardContainer from "./newProductModal/NewWizardContainer";
import { BsFiletypeXlsx } from "react-icons/bs";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../components/forms/Input";
import Button from "../../components/misc/Button";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import { translateMeasure, translateProductTypes } from "../../utils/translate";
import useServerSupplier from "../../api/useServerSupplier";
import UnlimitedBadge from "../../components/misc/badges/UnlimitedBadge";
import useProduct from "../../hooks/useProduct";

export default function ListProducts() {
  const {
    allProducts,
    paginate,
    getAllProducts,
    getProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    manageSupplies,
    updateFixedCostState,
    manageCombos,
    manageManufacturer,
    updateAttributeState,
    updateVariationState,
    isLoading,
    outLoading,
    isFetching,
    product,
    productRecords,
    getRecordsProduct,
    paginateRecords,
    isFetchingB,
    priceSystem,
  } = useServerProduct();

  const { allSuppliers, getAllSuppliers } = useServerSupplier();
  const { getCost, getPrice, getProfit } = useProduct();

  const [filter, setFilter] = useState<BasicType>({ page: 1 });
  const [detailModal, setDetailModal] = useState(false);

  //Initial Config------------------------------------------------------------------------------------

  const { business } = useAppSelector((state) => state.init);
  const { measures, salesCategories } = useAppSelector(
    (state) => state.nomenclator
  );

  const { availableCurrencies: allCurrencies } = business!;

  //CRUD Variable for detail modal
  const crud = {
    updateProduct,
    deleteProduct,
    manageSupplies,
    manageCombos,
    manageManufacturer,
    updateFixedCostState,
    updateAttributeState,
    updateVariationState,
    isFetching,
    productRecords,
    getRecordsProduct,
    paginateRecords,
    isLoading,
    isFetchingB,
  };

  //----------------------------------------------------------------------------------------------------

  const [newProductModal, setNewProductModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);

  useEffect(() => {
    getAllSuppliers({ all_data: true });
  }, []);

  useEffect(() => {
    getAllProducts(filter);
  }, [filter]);

  //-------------------------------------------------------------------------------------------------------

  //Data to display in Table------------------------------------------------------------------
  const action = (id: string) => {
    getProduct(id);
    setDetailModal(true);
  };

  //Data
  const titles: string[] = [
    "Nombre",
    "Categoría de almacén",
    "Categoría de venta",
    "Precio de venta",
    "Proveedor",
    "Ganancia",
    "Disponibilidad",
    "Costo unitario",
    "Tipo",
  ];
  const productDisplay: Array<DataTableInterface> = [];

  allProducts.forEach((item, idx) => {
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
        Nombre: item?.name,
        "Categoría de almacén": item?.productCategory?.name! ?? "",
        "Categoría de venta": item?.salesCategory?.name! ?? "",
        Proveedor:
          allSuppliers.find((elem) => elem.id === item.supplierId)?.name ?? "",
        "Precio de venta": getPrice({ product: item, priceSystemId:priceSystem?.id }) as string,
        Ganancia: getProfit({product:item, mode:"percent"}) + "%",
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
        "Costo unitario": getCost({product:item, setPrecision:true}),
        Tipo: <ProductTypeBadge type={item.type} />,
      },
    });
  });

  const actions: BtnActions[] = [
    {
      title: "Añadir producto",
      action: () => setNewProductModal(true),
      icon: <PlusIcon className="h-5" />,
    },
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  //--------------------------------------------------------------------------------------------------

  //Filtros ------------------------------------------------------------------------
  const salesCategoryData: SelectInterface[] =
    salesCategories.map((item) => ({ id: item.id, name: item.name })) ?? [];
  const measureSelectorData: SelectInterface[] =
    measures.map((item) => ({ id: item.code, name: item.value })) ?? [];
  //@ts-ignore
  const productTypeSelector: SelectInterface[] =
    business?.configurationsKey
      .find((config) => config.key === "type_products")
      ?.value.split(",")
      ?.map((type) => ({
        id: type,
        name: translateProductTypes(type),
      })) ?? [];

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
      format: "select",
      filterCode: "productCategoryId",
      name: "Categoría de venta",
      data: salesCategoryData,
    },
    {
      format: "boolean",
      filterCode: "showForSale",
      name: "Listos para vender",
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

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis Productos",
    },
    { name: "Todos" },
  ];
  //------------------------------------------------------------------------------------

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
      <GenericTable
        actions={actions}
        tableTitles={titles}
        tableData={productDisplay}
        rowAction={action}
        loading={outLoading}
        searching={searching}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
        showSpecificColumns={true}
      />

      {detailModal && (
        <Modal state={detailModal} close={() => setDetailModal(false)} size="l">
          <DetailProductContainer
            product={product}
            loading={isLoading}
            crud={crud}
            closeModal={() => setDetailModal(false)}
          />
        </Modal>
      )}

      {newProductModal && (
        <Modal
          state={newProductModal}
          close={() => setNewProductModal(false)}
          size="m"
        >
          <NewWizardContainer
            action={addProduct}
            closeModal={() => setNewProductModal(false)}
            loading={isFetching}
          />
        </Modal>
      )}

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            filter={filter}
            closeModal={() => setExportModal(false)}
            allSuppliers={allSuppliers}
            allCurrencies={allCurrencies}
          />
        </Modal>
      )}
    </>
  );
}

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
  allSuppliers: SupplierInterfaces[];
  allCurrencies: CurrencyInterface[];
}

const ExcelFileExport = ({
  filter,
  closeModal,
  allSuppliers,
  allCurrencies,
}: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportProducts, isLoading } = useServerProduct();

  const { titlesForExport } = useAppSelector((state) => state.nomenclator);

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportProducts(
      filter,
      data.name,
      allSuppliers,
      allCurrencies,
      titlesForExport,
      closeModal()
    );
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
