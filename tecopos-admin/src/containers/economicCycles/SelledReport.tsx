/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import {
  formatCalendar,
  formatCurrency,
  generatePdf,
} from "../../utils/helpers";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import {
  BasicType,
  SelledProductReport,
} from "../../interfaces/InterfacesLocal";
import ScrollTypeFilter from "../../components/misc/ScrollTypeFilter";
import {
  PriceInvoiceInterface,
} from "../../interfaces/ServerInterfaces";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import { FaPrint, FaRegFilePdf } from "react-icons/fa";
import SelledProductsPdf from "../../reports/SelledProductsPdf";
import { EcoCycleContext } from "./DetailEcoCycleContainer";
import { PrintSelledReportTicket } from "./PrintSelledReportTicket";

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
  const { ecoCycleId: id } = useParams();
  const { getSelledReport, selledReport, isLoading } = useServerEcoCycle();
  const [filter, setFilter] = useState<BasicType>({ economicCycleId: id! });
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { rollSize } = useAppSelector((state) => state.session);

  const { ecoCycle } = useContext(EcoCycleContext)

  useEffect(() => {
    getSelledReport(filter);
  }, [filter]);

  //Data for table ----------------------------------------------------------------------
  //Data for table ----------------------------------------------------------------------------
  const dataByCategories: SelledProductReport[] = [];
  selledReport &&
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
        totalQuantity: product.totalQuantity,
      };
      const found = dataByCategories.find(
        (item) => item.salesCategory === product.salesCategory
      );
      if (found) {
        found.products.push(prod);
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

  const actions: BtnActions[] = [
    {
      title: "Exportar a pdf",
      icon: <FaRegFilePdf />,
      action: () =>
        generatePdf(
          <SelledProductsPdf
            report={dataByCategories}
            ecoCycle={`Fecha: ${formatCalendar(ecoCycle?.openDate)} ${ecoCycle?.closedDate
              ? "=> " + formatCalendar(ecoCycle?.closedDate)
              : ""
              }   Área: ${areaSales.find(area => area.id === filter?.areaSalesId)?.name ?? "Todas"}`}
            dataByCategories={dataByCategories}
          />,
          "Reporte de ventas"
        ),
    },
    {
      title: "Imprimir ticket",
      icon: <FaPrint className="h-5" />,
      action: () => {
        PrintSelledReportTicket({ selledReport, totales, ecoCycle, rollSize });
      },
    }
  ];

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
    "Disponibilidad actual"
  ];

  const tableData: DataTableInterface[] = [];
  dataByCategories.sort(orderByString).forEach((elem) => {
    tableData.push({
      borderTop: true,
      payload: {
        "": <p className="text-base">{elem.salesCategory}</p>,
        searchHelp: null
      },
    });
    elem.products.sort((a: any, b: any) => b.totalSale[0].amount - a.totalSale[0].amount).forEach((prod) => {
      tableData.push({
        payload: {
          searchHelp: prod.name.toLowerCase(),
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
          "Disponibilidad actual": prod.totalQuantity
        },
      });
    });
    tableData.push({
      borderBottom: true,
      payload: {
        searchHelp: null,
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
      },
    });
  });

  if (dataByCategories.length !== 0)
    tableData.push({
      borderBottom: true,
      payload: {
        searchHelp: null,
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

  //--------------------------------------------------------------------------------------------

  //--------------------------------------------------------------------------------------------

  //Burble filter ------------------------------------
  const areaSales = areas
    .filter((area) => area.type === "SALE")
    .map((elem) => ({ id: elem.id, name: elem.name }));

  //-------------------------------------------
  const [localFilter, setLocalFilter] = useState<string | null>(null);

  let searching = {
    placeholder: "Buscar producto",
    action: (value: string) =>
      value ? setLocalFilter(value) : setLocalFilter(value),
  };

  return (
    <>
      <ScrollTypeFilter
        title="Área de venta"
        items={areaSales}
        current={filter?.areaSalesId ?? null}
        onChange={(item: string | number | null) =>
          setFilter({
            ...filter,
            areaSalesId: item,
          })
        }
      />
      <GenericTable
        actions={actions}
        tableTitles={tableTitles}
        //@ts-ignore
        tableData={(localFilter === null || localFilter === "") ? tableData : tableData.filter(elem => elem.payload.searchHelp !== null && elem.payload.searchHelp?.includes(localFilter.toLowerCase()))}
        loading={isLoading}
        lastColumnInGray={true}
        searching={searching}
      />
    </>
  );
}
