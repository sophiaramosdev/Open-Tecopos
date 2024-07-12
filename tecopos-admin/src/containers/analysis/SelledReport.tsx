/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import {
  cleanObj,
  exportExcel,
  formatCurrency,
  roundTwoDecimals,
} from "../../utils/helpers";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import {
  BasicType,
  SelectInterface,
  SelledProductReport,
} from "../../interfaces/InterfacesLocal";
import Breadcrumb from "../../components/navigation/Breadcrumb";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "../../store/hooks";
import Button from "../../components/misc/Button";
import { ExtendedNomenclator, PriceInvoiceInterface } from "../../interfaces/ServerInterfaces";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import Modal from "../../components/misc/GenericModal";
import Input from "../../components/forms/Input";
import useServerCoupon from "../../api/useServerCoupons";
import SearchCriteriaComponent, {
  BasicTypeFilter,
  DateTypeFilter,
  SelectTypeFilter,
} from "../../components/misc/SearchCriteriaComponent";
import useDebounceValue from "../../hooks/useDebounceValue";

const orderByString = (a: any, b: any) => {
  let x = a.salesCategory.toLowerCase();
  let y = b.salesCategory.toLowerCase();
  if (x < y) {
    return -1;
  }
  if (x > y) {
    return 1;
  }
  return 0;
};

export default function ReportsSalesByProducts() {
  const { getSelledReport, selledReport, isLoading } = useServerEcoCycle();
  const {
    allCoupons,
    getAllCoupons,
    outLoading: loadingCoupons,
  } = useServerCoupon();

  const { areas, salesCategories, productCategories } = useAppSelector(
    (state) => state.nomenclator
  );
  const [exportModal, setExportModal] = useState(false);
  const [clearFilters, setClearFilters] = useState(false);
  const [orderBy, setOrderBy] = useState(0);

  useForm();

  const [couponSearch, setCouponSearch] = useState("");
  const couponSearchValue = useDebounceValue(couponSearch, 700);


  useEffect(() => {
    if (couponSearchValue.length > 1) {
      getAllCoupons({ all_data: true, search: couponSearchValue });
    }
  }, [couponSearchValue]);

  const coupons = useMemo(
    () =>
      allCoupons.map((cupon) => ({
        id: cupon.code,
        name: cupon.code,
      })),
    [allCoupons]
  );

  const areaSalesSelector: SelectInterface[] = areas
    .filter((item) => item.type === "SALE")
    .map((area) => ({
      id: area.id,
      name: area.name,
    }));

  const salesCategorySelector: SelectInterface[] = salesCategories.map(
    (cat) => ({ id: cat.id, name: cat.name })
  );
  const productCategorySelector: SelectInterface[] = productCategories.map(
    (cat) => ({ id: cat.id, name: cat.name })
  );

  //Submit form ----------------------------------------------------------------------------------
  const onSubmit: SubmitHandler<BasicType> = (data) => {
    if (Object.keys(data).length > 0) {
      const allFilters = cleanObj({
        ...data,
      });
      getSelledReport(allFilters);
      setClearFilters(false);
    } else setClearFilters(true);
  };

  //--------------------------------------------------------------------------------------------
  //Data for table ----------------------------------------------------------------------------
  const dataByCategories: SelledProductReport[] = [];
  selledReport &&
    !clearFilters &&
    selledReport.products.forEach((product) => {
      const prod = {
        name: product.name,
        areaSale: product.areaSales,
        salesPrice: product.totalSales,
        quantity: product.quantitySales,
        totalCost: product.totalCost,
        totalSale: product.totalSales,
        enableGroup: product.enableGroup,
        groupConvertion: product.groupConvertion,
        groupName: product.groupName,
        totalQuantity: product.totalQuantity
      };
      const found = dataByCategories.find(
        (item) => item.salesCategory === product.salesCategory
      );
      if (found) {
        if (orderBy === 1) {
          let i = 0;
          while (i < found.products.length && prod.quantity < found.products[i].quantity) {
            i++;
          }
          found.products.splice(i, 0, prod);
        } else if (orderBy === 2) {
          let i = 0;
          while (i < found.products.length && prod.quantity > found.products[i].quantity) {
            i++;
          }
          found.products.splice(i, 0, prod);
        } else {
          found.products.push(prod);
        }
        found.subtotals = {
          quantity: prod.quantity + (found.subtotals?.quantity ?? 0),
          totalCost: {
            amount:
              prod.totalCost.amount + (found.subtotals?.totalCost?.amount ?? 0),
            codeCurrency: prod.totalCost.codeCurrency,
          },
          totalSale: (function () {
            const totals: PriceInvoiceInterface[] = [
              ...found.subtotals.totalSale!,
            ];
            prod.totalSale.forEach((itm) => {
              const idx = totals.findIndex(
                (elem) => elem.codeCurrency === itm.codeCurrency
              );
              if (idx !== -1) {
                totals.splice(idx, 1, {
                  ...totals[idx],
                  amount: itm.amount + totals[idx].amount,
                });
              } else {
                totals.push(itm);
              }
            });
            return totals;
          })(),
        };
      } else {
        dataByCategories.push({
          salesCategory: product.salesCategory,
          products: [prod],
          subtotals: {
            quantity: prod.quantity,
            totalCost: prod.totalCost,
            totalSale: prod.totalSale,
          },
        });
      }
    });

  const totalSales: PriceInvoiceInterface[] = [];
  dataByCategories.forEach((elem) => {
    elem.subtotals.totalSale?.forEach((itm) => {
      const idx = totalSales.findIndex(
        (current) => current.codeCurrency === itm.codeCurrency
      );
      idx !== -1
        ? totalSales.splice(idx, 1, {
          ...totalSales[idx],
          amount: totalSales[idx].amount + itm.amount,
        })
        : totalSales.push(itm);
    });
  });

  const totales: {
    quantity: number;
    totalCost: PriceInvoiceInterface;
    totalSales: PriceInvoiceInterface[];
  } = {
    quantity: dataByCategories.reduce(
      (total, itm) => total + itm.subtotals.quantity!,
      0
    ),
    totalCost: {
      amount: dataByCategories.reduce(
        (total, itm) => total + itm.subtotals.totalCost!.amount,
        0
      ),
      codeCurrency: dataByCategories[0]?.subtotals.totalCost?.codeCurrency!,
    },
    totalSales,
  };

  const tableTitles = [
    "",
    "Cantidad",
    "Costo unitario ponderado",
    "Costo total",
    "Precio unitario ponderado",
    "Precio total ventas",
    "Disponibilidad"
  ];
  const tableData: DataTableInterface[] = [];
  if (orderBy === 1) {
    dataByCategories.sort((a: SelledProductReport, b: SelledProductReport) => (a.subtotals.quantity !== undefined && b.subtotals.quantity !== undefined) ? b.subtotals.quantity - a.subtotals.quantity : 0);
  } else if (orderBy === 2) {
    dataByCategories.sort((a: SelledProductReport, b: SelledProductReport) => (a.subtotals.quantity !== undefined && b.subtotals.quantity !== undefined) ? a.subtotals.quantity - b.subtotals.quantity : 0);
  } else {
    dataByCategories.sort(orderByString)
  }
  dataByCategories.forEach((elem) => {

    tableData.push({
      borderTop: true,
      payload: {
        "": <p className="text-base">{elem.salesCategory}</p>,
      },
    });
    //elem.products.sort((a:any, b:any)=>b.totalSale[0].amount - a.totalSale[0].amount).forEach((prod) => {
    elem.products.forEach((prod) => {
      const quantityByGroup: (quantity: number) => React.ReactElement | void = (
        quantity
      ) => {
        if (!!prod.enableGroup) {
          const rest = quantity % prod.groupConvertion;
          return (
            <div className="flex-col">
              <div>
                {`${Math.trunc(quantity / prod.groupConvertion)} ${prod.groupName
                  }`}
              </div>
              {rest !== 0 && (
                <p>
                  {"(+" + rest /*+ translateMeasure(prod.measure)*/ + ")"}
                </p>
              )}
            </div>
          );
        }
      };
      tableData.push({
        payload: {
          "": <div className="pl-5 text-gray-600">{prod.name}</div>,
          Cantidad: prod.quantity,
          "Costo unitario ponderado": formatCurrency(
            prod.totalCost.amount / prod.quantity,
            prod.totalCost.codeCurrency
          ),
          "Costo total": formatCurrency(
            prod.totalCost.amount,
            prod.totalCost.codeCurrency
          ),
          "Precio unitario ponderado": (
            <div className="flex flex-col">
              {prod.salesPrice.map((itm, idx) => (
                <p key={idx}>
                  {formatCurrency(itm.amount / prod.quantity, itm.codeCurrency)}
                </p>
              ))}
            </div>
          ),
          "Precio total ventas": (
            <div className="flex flex-col">
              {prod.salesPrice.map((itm, idx) => (
                <p key={idx}>{formatCurrency(itm.amount, itm.codeCurrency)}</p>
              ))}
            </div>
          ),
          "Disponibilidad": (
            <div className="flex-col">
              <div className="text-sm">
                {quantityByGroup(prod.totalQuantity) ?? prod.totalQuantity}
              </div>
            </div>
          ),
        },
      });
    });
    tableData.push({
      borderBottom: true,
      payload: {
        "": "Subtotales",
        Cantidad: <p className="font-semibold">{elem.subtotals?.quantity}</p>,
        "Costo total": (
          <div className="font-semibold">
            {formatCurrency(
              elem.subtotals.totalCost!.amount,
              elem.subtotals.totalCost!.codeCurrency
            )}
          </div>
        ),
        "Precio total ventas": (
          <div className="font-semibold flex flex-col">
            {elem.subtotals.totalSale?.map((itm, idx) => (
              <p key={idx}>{formatCurrency(itm.amount, itm.codeCurrency)}</p>
            ))}
          </div>
        ),
        "Disponibilidad": ""
      },
    });
  });

  if (dataByCategories.length !== 0)
    tableData.push({
      borderBottom: true,
      payload: {
        "": <p className="font-semibold text-base">Totales</p>,
        Cantidad: <p className="font-semibold">{totales.quantity}</p>,
        "Costo total": (
          <p className="font-semibold">
            {formatCurrency(
              totales.totalCost.amount,
              totales.totalCost.codeCurrency
            )}
          </p>
        ),
        "Precio total ventas": (
          <div className="flex flex-col font-semibold">
            {totales.totalSales.map((item, idx) => (
              <p key={idx}>{formatCurrency(item.amount, item.codeCurrency)}</p>
            ))}
          </div>
        ),
      },
    });

  const tableAction: BtnActions[] = [
    {
      title: "Exportar a excel",
      icon: <BsFiletypeXlsx className="text-base" />,
      action: () => setExportModal(true),
    },
  ];
  //--------------------------------------------------------------------------------------------

  const exportAction = (name: string) => {
    const priceCurrencies: string[] = [];
    selledReport?.products.forEach((elem) => {
      const price = elem.totalSales.find(
        (itm) => !priceCurrencies.includes(itm.codeCurrency)
      );
      if (price) {
        priceCurrencies.push(price.codeCurrency);
      }
    });
    const dataToExport: Record<string, string | number>[] =
      selledReport?.products.map((item) => {
        let data = {
          Productos: item.name,
          Cantidad: item.quantitySales,
          [`Costo unitario ponderado en ${item.totalCost.codeCurrency}`]:
            item.totalCost.amount / item.quantitySales,
          [`Costo total en ${item.totalCost.codeCurrency} `]:
            item.totalCost.amount,
        };
        priceCurrencies.forEach((currency) => {
          const totalSale = item.totalSales.find(
            (price) => price.codeCurrency === currency
          );
          data[`Precio unitario ponderado en ${currency}`] = roundTwoDecimals(
            (totalSale?.amount ?? 0) / item.quantitySales
          );
          data[`Precio total venta en ${currency}`] = totalSale?.amount ?? 0;
        });
        return data;
      }) ?? [];
    exportExcel(dataToExport, name);
  };

  //Management filters ------------------------------------------------------------------------
  const availableFilters: (
    | BasicTypeFilter
    | DateTypeFilter
    | SelectTypeFilter
  )[] = [];

  availableFilters.push(
    {
      name: "dateRange",
      isRequired: true,
      label: "Rango de fechas",
      type: "datepicker-range-including-time",
      datepickerRange: [
        {
          name: "dateFrom",
          label: "Desde",
          isUnitlToday: true,
        },
        {
          name: "dateTo",
          label: "Hasta",
          isUnitlToday: true,
        },
      ],
    },
    {
      label: "Punto de venta",
      name: "areaSalesId",
      type: "select",
      data: areaSalesSelector,
    },
    {
      label: "Categoría de venta",
      name: "salesCategoryId",
      type: "select",
      data: salesCategorySelector,
    },
    {
      label: "Categoría de almacén",
      name: "productCategoryId",
      type: "select",
      data: productCategorySelector,
    },
    {
      label: "Origen",
      name: "origin",
      type: "multiselect",
      data: [
        { name: "Puntos de venta", id: "pos" },
        { name: "Tienda online", id: "online" },
      ],
    },
    {
      label: "Incluir órdenes consumo casa",
      name: "includeHouseCostedOrder",
      type: "boolean",
    },
    {
      label: "Cliente",
      name: "clientId",
      type: "select",
      asyncData: {
        url: "/customer",
        dataCode: ["firstName", "lastName", "email"],
        defaultParams: { page: 1 },
        idCode: "id"
      },
    },
    {
      label: "Proveedor",
      name: "supplierId",
      type: "select",
      asyncData: {
        url: "/administration/supplier",
        dataCode: "name",
        defaultParams: { page: 1 },
        idCode: "id"
      },
    },
    {
      label: "Cupones",
      name: "coupons",
      type: "multiselect",
      onChange: (value: string) => {
        if (typeof value === "string") setCouponSearch(value);
      },
      isLoading: loadingCoupons,
      defaultValue: couponSearch.split(","),
      data: coupons,
    }
  );

  //-----------------------------------------------------------------------------


  let availableFiltersByOrder: ExtendedNomenclator[] = [
    {
      id: 1,
      name: "Cantidad de productos vendidos",
      availableOptions: [{ name: 'De mayor a menor', id: 1 }, { name: 'De menor a mayor', id: 2 }],
      action: (data: number) => data ? setOrderBy(data) : setOrderBy(0),
      reset: () => setOrderBy(0),
    }
  ]
  return (
    <>
      <Breadcrumb
        icon={<ArrowTrendingUpIcon className="h-6 text-gray-500" />}
        paths={[{ name: "Análisis" }, { name: "Venta por productos" }]}
      />

      <SearchCriteriaComponent
        filterAction={(data: FieldValues) => onSubmit(data)}
        filters={availableFilters}
      />

      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        actions={tableAction}
        loading={isLoading}
        orderBy={{ availableFilters: availableFiltersByOrder }}
      />

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExportModalContainer
            exportAction={exportAction}
            close={() => setExportModal(false)}
          />
        </Modal>
      )}
    </>
  );
}

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
