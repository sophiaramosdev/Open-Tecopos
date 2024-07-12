import useServerArea from "../../../../../api/useServerArea";
import { useEffect, useMemo, useState } from "react";
import { exportExcel, formatCurrency, generatePdf } from "../../../../../utils/helpers";
import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import Check from "../../../../../components/forms/GenericCheck";
import GenericToggle from "../../../../../components/misc/GenericToggle";
import { BasicType } from "../../../../../interfaces/InterfacesLocal";
import useServer from "../../../../../api/useServerMain";
import { translateMeasure } from "../../../../../utils/translate";
import { BtnActions } from "../../../../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import StockAviablePdf from "./pdfAndExcel/StockAviablePdf";
import { FaRegFilePdf } from "react-icons/fa";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../../../components/forms/Input";
import Button from "../../../../../components/misc/Button";
import Modal from "../../../../../components/misc/GenericModal";

const StockAviable = () => {
  const {
    getAllStockAviables,
    stockAviable,
    changeStockAviable,
    changeStockAviableCategory,
    isLoading,
  } = useServerArea();
  const [is_only_category, setIsOnlyCategory] = useState(false);
  const [filter, setFilter] = useState<BasicType>();

  const [exportModal, setExportModal] = useState<boolean>(false)
  const { allowRoles: verifyRoles } = useServer();
  
  useEffect(() => {
    getAllStockAviables(filter, is_only_category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, is_only_category]);

  const totalProducts = useMemo(() => {
    let products = stockAviable?.products;
    const total_cost =
      products && products.length > 0
        ? products
          .filter((itm) => itm?.active ?? true)
          .reduce((total, item) => item.total_cost + total, 0)
        : 0;

    const total_disp =
      products && products.length > 0
        ? products
          .filter((itm) => itm?.active ?? true)
          .reduce((total, item) => item.disponibility + total, 0)
        : 0;
    const total_estimated_profits =
      products && products.length > 0
        ? products
          .filter((itm) => itm?.active ?? true)
          .reduce((total, item) => item.total_estimated_profits + total, 0)
        : 0;
    const total_estimated_sales =
      products && products.length > 0
        ? products
          .filter((itm) => itm?.active ?? true)
          .reduce((total, item) => item.total_estimated_sales + total, 0)
        : 0;

    return {
      total_cost,
      total_estimated_profits,
      total_estimated_sales,
      total_disp,
    };
  }, [stockAviable?.products]);

  const totalCategories = useMemo(() => {
    let categories = stockAviable?.categories;
    const total_disp =
      categories && categories.length > 0
        ? categories
          .filter((itm) => itm.active)
          .reduce((total, item) => item.total_disp + total, 0)
        : 0;

    const total_cost =
      categories && categories.length > 0
        ? categories
          .filter((itm) => itm.active)
          .reduce((total, item) => item.total_cost + total, 0)
        : 0;

    const total_estimated_profits =
      categories && categories.length > 0
        ? categories
          .filter((itm) => itm.active)
          .reduce((total, item) => item.total_estimated_profits + total, 0)
        : 0;
    const total_estimated_sales =
      categories && categories.length > 0
        ? categories
          .filter((itm) => itm.active)
          .reduce((total, item) => item.total_estimated_sales + total, 0)
        : 0;
    return {
      total_cost,
      total_estimated_profits,
      total_estimated_sales,
      total_disp,
    };
  }, [stockAviable?.categories]);

  const groupedAmounts = useMemo(() => {
    let products = stockAviable?.products;
    let grouped: { amount: number; measure: string }[] = [];
  
    if (products && products.length > 0) {
      let groupedByMeasure: { [key: string]: number } = {};
  
      products
        .filter((itm) => itm?.active ?? true)
        .forEach((item) => {
          if (groupedByMeasure[item.measure]) {
            groupedByMeasure[item.measure] += item.disponibility;
          } else {
            groupedByMeasure[item.measure] = item.disponibility;
          }
        });
  
      for (let measure in groupedByMeasure) {
        grouped.push({ amount: groupedByMeasure[measure], measure });
      }
    }
  
    return grouped;
  }, [stockAviable?.products]);
  
  let uniqueStockName: string[] = [];

  stockAviable?.products?.forEach((list , idx) => {
    list.stocks?.forEach((stock) => {
      if (!uniqueStockName.includes(stock.stockName) ) {
        uniqueStockName.push(stock.stockName);
      }
    });
  });


  let tableTitles = is_only_category
    ? [
      "Categorías",
      "Disponibilidad",
    ]
    : [
      "Productos",
      "U/M",
      ...uniqueStockName,
      "Disponibilidad",
    ];

  if (verifyRoles(['ADMIN','MANAGER_CONTABILITY','OWNER'],true)) {
    tableTitles.push("Costo total");
    tableTitles.push("Venta estimada");
    tableTitles.push("Ganancia estimada");
  }


  let dataForExcelFile:Record<string, string | number>[] = []

  dataForExcelFile = is_only_category
    ? stockAviable?.categories.map((item) => ({
      Categorías: item.salesCategoryName,
      "U/M": translateMeasure(item.measure),
      Disponibilidad: item.total_disp,
      ...(verifyRoles(['ADMIN','MANAGER_CONTABILITY','OWNER'],true) && {
        "Costo total": formatCurrency(
          item.total_cost,
          stockAviable.costCurrency,
          2
        ),
        "Venta estimada": formatCurrency(
          item.total_estimated_sales,
          stockAviable.costCurrency,
          2
        ),
        "Ganancia estimada": formatCurrency(
          item.total_estimated_profits,
          stockAviable.costCurrency,
          2
        ),
      }),
    })) ?? []
    : stockAviable?.products?.map((list) => {
      const quantityMap = uniqueStockName.reduce((acc, title) => {
        const value = list?.stocks?.find((c) => (c.stockName === title));
        const quantity = value ? value.quantity : 0;
        acc[title] = quantity ?? 0;
        return acc;
      }, {} as Record<string, string | number>);

      return {
        Productos: list.productName,
        "U/M": translateMeasure(list.measure),
        ...quantityMap,
        Disponibilidad: list.disponibility,
        ...(verifyRoles(['ADMIN','MANAGER_CONTABILITY','OWNER'],true) && {
          "Costo total": formatCurrency(
            list.total_cost,
            stockAviable.costCurrency,
            2
          ),
          "Venta estimada": formatCurrency(
            list.total_estimated_sales,
            stockAviable.costCurrency,
            2
          ),
          "Ganancia estimada": formatCurrency(
            list.total_estimated_profits,
            stockAviable.costCurrency,
            2
          ),
        }),
      }
   }) ?? [];

  if (stockAviable?.products?.length !== 0 && !is_only_category) {
    dataForExcelFile.push({
        Productos: "Total",
        "U/M": groupedAmounts?.map((item) => translateMeasure(item.measure)).join(', '),
        Disponibilidad: groupedAmounts?.map(( item) => item.amount).join(', '),
        ...(verifyRoles(['ADMIN','MANAGER_CONTABILITY','OWNER'],true) && {
        "Costo total": formatCurrency(
          totalProducts.total_cost,
          stockAviable?.costCurrency,
          2
        ),
        "Venta estimada": formatCurrency(
          totalProducts.total_estimated_sales,
          stockAviable?.costCurrency,
          2
        ),
        "Ganancia estimada": formatCurrency(
          totalProducts.total_estimated_profits,
          stockAviable?.costCurrency,
          2
        ),
      }),
    });
  } else if (stockAviable?.categories?.length !== 0 && is_only_category) {
    dataForExcelFile.push({
        Categorías: "Total",
        Disponibilidad: totalCategories.total_disp,
        ...(verifyRoles(['ADMIN','MANAGER_CONTABILITY','OWNER'],true) && {
        "Costo total": formatCurrency(
          totalCategories.total_cost,
          stockAviable?.costCurrency,
          2
        ),
        "Venta estimada": formatCurrency(
          totalCategories.total_estimated_sales,
          stockAviable?.costCurrency,
          2
        ),
        "Ganancia estimada": formatCurrency(
          totalCategories.total_estimated_profits,
          stockAviable?.costCurrency,
          2
        ),
      }),
    });
  }

  let tableData: DataTableInterface[];

  tableData = is_only_category
    ? stockAviable?.categories.map((item, idx) => ({
      rowId: item.salesCategoryName,
      deletedRow: item.active === false,
      payload: {
        Categorías: (
          <div className="inline-flex gap-2 items-center">
            <Check
              value={idx}
              checked={item.active}
              onChange={(e) =>
                changeStockAviableCategory(
                  Number(e.target.value),
                  e.target.checked
                )
              }
            />
            <span className="font-semibold text-gay-500 cursor-pointer">
              {item.salesCategoryName}
            </span>
          </div>
        ),
        "U/M":translateMeasure(item.measure),
        Disponibilidad: (
          <span className="font-semibold text-gay-500 ">
            {item.total_disp}
          </span>
        ),
        "Costo total": formatCurrency(
          item.total_cost,
          stockAviable.costCurrency,
          2
        ),
        "Venta estimada": formatCurrency(
          item.total_estimated_sales,
          stockAviable.costCurrency,
          2
        ),
        "Ganancia estimada": (
          <p
            className={`${item.total_estimated_profits > 0
                ? "text-green-500"
                : item.total_estimated_profits < 0
                  ? "text-red-500"
                  : ""
              }`}
          >
            {formatCurrency(
              item.total_estimated_profits,
              stockAviable.costCurrency,
              2
            )}
          </p>
        ),
      },
    })) ?? []
    : stockAviable?.products?.map((list , idx) => {
      const quantityMap = uniqueStockName.reduce((acc, title) => {
       const value = list?.stocks?.find((c) => (c.stockName === title));
       const quantity = value ? value.quantity : 0;
       acc[title] = (
         <span>
           {quantity ?? 0}
         </span>
       );
       return acc;
     }, {} as Record<string, JSX.Element>);
     
     return {
      rowId: list.productId,
      deletedRow: list.active === false,
      payload: {
        Productos: (
          <div className="inline-flex gap-2 items-center">
            <Check
              value={idx}
              checked={list?.active ?? true}
              onChange={(e) =>
                changeStockAviable(Number(e.target.value), e.target.checked)
              }
            />

            <span className="font-semibold text-gay-500 ">
              {list.productName}
            </span>
          </div>
        ),
        ...quantityMap,
        "U/M":translateMeasure(list.measure),
        Disponibilidad: (
          <span className="font-semibold text-gay-500 ">
            {list.disponibility}
          </span>
        ),

        "Costo total": formatCurrency(
          list.total_cost,
          stockAviable.costCurrency,
          2
        ),
        "Venta estimada": formatCurrency(
          list.total_estimated_sales,
          stockAviable.costCurrency,
          2
        ),
        "Ganancia estimada": (
          <p
            className={`${list.total_estimated_profits > 0
                ? "text-green-500"
                : list.total_estimated_profits < 0
                  ? "text-red-500"
                  : ""
              }`}
          >
            {formatCurrency(
              list.total_estimated_profits,
              stockAviable.costCurrency,
              2
            )}
          </p>
        ),
      },
     }
  
   }) ?? [];

  if (stockAviable?.products.length !== 0 && !is_only_category) {
    tableData.push({
      rowId: "totals",
      payload: {
        "": "",
        Productos: "Total",
        "U/M": groupedAmounts?.map((item , index) => {
         return  <div>{translateMeasure(item.measure)}</div>
        }),
        Disponibilidad: groupedAmounts?.map((item , index) => {
          return  <div className="font-semibold">{item.amount}</div>
         }),
        "Costo total": <span className="font-semibold">{formatCurrency(
          totalProducts.total_cost,
          stockAviable?.costCurrency,
          2
        )}</span>,
        "Venta estimada": (
          <span className="font-semibold">
            {formatCurrency(
              totalProducts.total_estimated_sales,
              stockAviable?.costCurrency,
              2
            )}
          </span>
        ),
        "Ganancia estimada": (
          <p
            className={`font-semibold ${totalProducts.total_estimated_profits > 0
                ? "text-green-500"
                : totalProducts.total_estimated_profits < 0
                  ? "text-red-500"
                  : ""
              }`}
          >
            {formatCurrency(
              totalProducts.total_estimated_profits,
              stockAviable?.costCurrency,
              2
            )}
          </p>
        ),
      },
    });
  } else if (stockAviable?.categories.length !== 0 && is_only_category) {
    tableData.push({
      rowId: "totals",
      payload: {
        "": "",
        Categorías: "Total",
        Disponibilidad: (
          <span className="font-semibold">{totalCategories.total_disp}</span>
        ),
        "Costo total": (
          <span className="font-semibold">
            {formatCurrency(
              totalCategories.total_cost,
              stockAviable?.costCurrency,
              2
            )}
          </span>
        ),
        "Venta estimada": (
          <span className="font-semibold">
            {formatCurrency(
              totalCategories.total_estimated_sales,
              stockAviable?.costCurrency,
              2
            )}
          </span>
        ),
        "Ganancia estimada": (
          <p
            className={`font-semibold ${totalCategories.total_estimated_profits > 0
                ? "text-green-500"
                : totalCategories.total_estimated_profits < 0
                  ? "text-red-500"
                  : ""
              }`}
          >
            {formatCurrency(
              totalCategories.total_estimated_profits,
              stockAviable?.costCurrency,
              2
            )}
          </p>
        ),
      },
    });
  }


  const searching = {
    action: (search: string | null) =>
      setFilter(search ? { search } : { page: 1 }),
    placeholder: is_only_category
      ? "Buscar Categoría"
      : "Buscar Producto",
  };

  const tableAction: BtnActions[] = [
    {
      title: "Exportar a excel",
      icon: <BsFiletypeXlsx className="text-base" />,
      action: () => setExportModal(true)
    },
    {
      title: "Exportar a pdf",
      icon: <FaRegFilePdf className="text-base" />,
      action() {
        generatePdf(
          <StockAviablePdf stockAviable={stockAviable} is_only_category={is_only_category} groupedAmounts={groupedAmounts} totalCategories={totalCategories} permissions={verifyRoles(['ADMIN','MANAGER_CONTABILITY','OWNER'],true)} totalProducts={totalProducts}/>,
          'Reporte'
        )
      },
    },
  ];

  const exportAction = (name: string) => {
    const dataToExport: Record<string, string | number>[] = dataForExcelFile ?? [];
    exportExcel(dataToExport, name);
  };

  return (
    <div>
      <div>
        <GenericToggle
          changeState={setIsOnlyCategory}
          currentState={is_only_category}
          title="Solo categorías"
        />
      </div>
      
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        loading={isLoading}
        searching={searching}
        actions={tableAction}
          maxTableHeight={'500px'}
          headSticky={true}
      />

      {!!exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExportModalContainer
            exportAction={exportAction}
            close={() => setExportModal(false)}
          />
        </Modal>
      )}
      {/* {openProductModal.state && (
          <Modal
              state={openProductModal.state}
              close={() => setOpenProductModal({state:false,id:openProductModal.id})}
          >
           <ProductInfo id={openProductModal.id} ></ProductInfo>
          </Modal>
      )} */}
    </div>
  );
};
export default StockAviable;

const ExportModalContainer = ({
  exportAction,
  close,
}: {
  exportAction: Function;
  close: Function;
}) => {
  const { control, handleSubmit } = useForm();
  const submit: SubmitHandler<Record<string, string>> = (data) => {
    exportAction(data.name);
    close();
  };
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Input
        name="name"
        control={control}
        label="Nombre del archivo .xlsx"
        rules={{ required: "Requerido *" }}
      />
      <div className="flex justify-end py-2">
        <Button color="slate-600" name="Aceptar" type="submit" />
      </div>
    </form>
  );
};
