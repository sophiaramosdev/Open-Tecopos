import { useState } from "react";
import {
  cleanObj,
  formatCurrency,
} from "../../utils/helpers";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import {
  BasicType,
  OrdersProductReport,
} from "../../interfaces/InterfacesLocal";
import Breadcrumb from "../../components/navigation/Breadcrumb";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { FieldValues, SubmitHandler } from "react-hook-form";
import { useAppSelector } from "../../store/hooks";
import {
  PriceInvoiceInterface,
} from "../../interfaces/ServerInterfaces";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import SearchCriteriaComponent, {
  BasicTypeFilter,
  DateTypeFilter,
  SelectTypeFilter,
} from "../../components/misc/SearchCriteriaComponent";
import { Check } from "heroicons-react";
import {
  translateOrderOrigin,
  translateOrderState,
} from "../../utils/translate";

export default function OrdersByProductsReport() {
  const { mainCurrency } = useAppSelector((state) => state.init.business!);
  const { getAllOrdesV2, allOrdes, isLoading } = useServerEcoCycle();
  // const [exportModal, setExportModal] = useState(false);
  const [clearFilters, setClearFilters] = useState(false);

  //Submit form ----------------------------------------------------------------------------------
  const onSubmit: SubmitHandler<BasicType> = (data) => {
    if (Object.keys(data).length > 0) {
      const allFilters = cleanObj({
        ...data,
      });
      getAllOrdesV2(allFilters);
      setClearFilters(false);
    } else setClearFilters(true);
  };

  //--------------------------------------------------------------------------------------------
  //Data for table ----------------------------------------------------------------------------
  const dataByCategories: OrdersProductReport[] = [];
  allOrdes &&
    !clearFilters &&
    allOrdes.forEach((order) => {
      const data = {
        operationNumber: order.operationNumber,
        status: order.status,
        origin: order.origin,
        areaSale: order.areaSales.name,
        totalCost: order.totalCost,
        payment: order.totalToPay,
        payed: !!order.paidAt,
      };
      const foundIndex = dataByCategories.findIndex(
        (item) => item.client?.id === order.client?.id
      );
      const totalToPay: PriceInvoiceInterface[] = [];
      const totalPayed: PriceInvoiceInterface[] = [];

      if (foundIndex !== -1) {
        dataByCategories[foundIndex].data.push(data);

        order.totalToPay.forEach((pay) => {
          const idx = totalToPay.findIndex(
            (item) => item.codeCurrency === pay.codeCurrency
          );
          if (idx !== -1) {
            totalToPay.splice(idx, 1, {
              ...totalToPay[idx],
              amount: totalToPay[idx].amount + pay.amount,
            });
          } else {
            totalToPay.push(pay);
          }
        });
        dataByCategories.splice(foundIndex, 1, {
          ...dataByCategories[foundIndex],
          subtotals: {
            totalCost:
              dataByCategories[foundIndex].subtotals.totalCost +
              order.totalCost,
            totalPayed,
            totalToPay,
          },
        });
      } else {
        dataByCategories.push({
          client: {
            id: order.client?.id,
            name:
              order.client?.firstName || order.client?.lastName
                ? order.client?.firstName ?? "" + order.client?.lastName ?? ""
                : order.client?.email,
          },
          data: [data],
          subtotals: {
            totalCost: order.totalCost,
            totalPayed: data.payed
              ? order.totalToPay
              : [{ amount: 0, codeCurrency: mainCurrency! }],
            totalToPay: order.totalToPay,
          },
        });
      }
    });

  const totales: {
    totalToPay: PriceInvoiceInterface[];
    totalPayed: PriceInvoiceInterface[];
    totalCost: number;
  } = { totalCost: 0, totalPayed: [], totalToPay: [] };

  totales.totalCost = dataByCategories.reduce(
    (total, item) => total + item.subtotals.totalCost,
    0
  );

  dataByCategories.forEach((itm) => {
    itm.subtotals.totalToPay.forEach((currentPay) => {
      const idx = totales.totalToPay.findIndex(
        (globalPay) => globalPay.codeCurrency === currentPay.codeCurrency
      );
      if (idx !== -1) {
        const current = totales.totalToPay[idx];
        totales.totalToPay.splice(idx, 1, {
          ...current,
          amount: current.amount + currentPay.amount,
        });
      } else {
        totales.totalToPay.push(currentPay);
      }
    });

    itm.subtotals.totalPayed.forEach((currentPay) => {
      const idx = totales.totalPayed.findIndex(
        (globalPay) => globalPay.codeCurrency === currentPay.codeCurrency
      );
      if (idx !== -1) {
        const current = totales.totalPayed[idx];
        totales.totalPayed.splice(idx, 1, {
          ...current,
          amount: current.amount + currentPay.amount,
        });
      } else {
        totales.totalPayed.push(currentPay);
      }
    });
  });

  const tableTitles = [
    "",
    "Estado",
    "Origen",
    "Área de venta",
    "Costo",
    "A pagar",
    "Pagado",
  ];
  const tableData: DataTableInterface[] = [];

  dataByCategories.forEach((elem) => {
    tableData.push({
      borderTop: true,
      payload: {
        "": <p className="text-base">{elem.client.name}</p>,
      },
    });

    elem.data.forEach((data) => {
      tableData.push({
        payload: {
          "": <div className="pl-5 text-gray-600">{data.operationNumber}</div>,
          Estado: translateOrderState(data.status),
          Origen: translateOrderOrigin(data.origin),
          "Área de venta": data.areaSale,
          Costo: formatCurrency(data.totalCost, mainCurrency),
          "A pagar": (
            <div className="flex flex-col">
              {data.payment.map((itm, idx) => (
                <p key={idx}>{formatCurrency(itm.amount, itm.codeCurrency)}</p>
              ))}
            </div>
          ),
          Pagado: data.payed ? <Check className="text-green-600 w-full" /> : "",
        },
      });
    });

   
  });


  const tableAction: BtnActions[] = [
    {
      title: "Exportar a excel",
      icon: <BsFiletypeXlsx className="text-base" />,
    },
  ];


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
      type: "datepicker-range",
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
        idCode: "id",
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
        idCode: "id",
      },
    }
  );

  //-----------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<ArrowTrendingUpIcon className="h-6 text-gray-500" />}
        paths={[{ name: "Análisis" }, { name: "Venta por órdenes" }]}
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
      />
    </>
  );
}
