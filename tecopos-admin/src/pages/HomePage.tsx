import { useEffect, useMemo, useRef, useState } from "react";
import GenericTable, {
  DataTableInterface,
} from "../components/misc/GenericTable";
import EmptyList from "../components/misc/EmptyList";
import SpinnerLoading from "../components/misc/SpinnerLoading";
import { Chart, Line, Pie, getElementAtEvent } from "react-chartjs-2";
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import Datalabels from "chartjs-plugin-datalabels";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import Button from "../components/misc/Button";
import moment from "moment";
import DateInput from "../components/forms/DateInput";
import { useForm, SubmitHandler } from "react-hook-form";
import InlineRadio, { InlineRadioData } from "../components/forms/InlineRadio";
import { getMaxValue, prettyNumber } from "../utils/helpers";
import useServerOrderProd from "../api/useServerOrderProd";
import { getPercent } from "../utils/helpers";
import {
  ChevronRightIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import UnlimitedBadge from "../components/misc/badges/UnlimitedBadge";
import { getGraphData } from "../store/actions/globals";
import GenericToggle from "../components/misc/GenericToggle";
import LastOperationsCard from "../components/misc/LastOperationsCard";
import PendingDispatch from "../components/misc/PendingDispatch";
import UnderLimitProductsCard from "../components/misc/UnderLimitProductsCard";
import { printPriceWithCommasAndPeriods } from "../utils/functions";
import useProduct from "../hooks/useProduct";

ChartJS.register(
  BarController,
  LinearScale,
  CategoryScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Datalabels
);

const HomeGroup = () => {
  const { graphsData, loading } = useAppSelector((state) => state.auxiliar);
  const { business } = useAppSelector((state) => state.init);
  const { handleSubmit, control, watch, getFieldState } = useForm();
  const dispatch = useAppDispatch();
  const { availableCurrencies, mainCurrency } = business!;
  const { formatPrice, convertCurrency } = useProduct();

  const [activeCurrency, setActiveCurrency] = useState<string>(mainCurrency);

  const [customRange, setCustomRange] = useState(false);

  const timeFilter = watch("timeFilter");
  useEffect(() => {
    if (!graphsData) {
      dispatch(
        getGraphData({
          dateMode: "today",
          dateRange: {
            dateFrom: moment().format("YYYY-MM-DD"),
            dateTo: moment().format("YYYY-MM-DD"),
          },
          businessMode: "group",
        })
      );
    } else if (getFieldState("timeFilter").isDirty) {
      switch (watch("timeFilter")) {
        case "yesterday":
          customRange && setCustomRange(false);
          dispatch(
            getGraphData({
              dateMode: "yesterday",
              dateRange: {
                dateFrom: moment().subtract(1, "d").format("YYYY-MM-DD"),
                dateTo: moment().subtract(1, "d").format("YYYY-MM-DD"),
              },
              businessMode: "group",
            })
          );
          break;

        case "week":
          customRange && setCustomRange(false);
          dispatch(
            getGraphData({
              dateMode: "week",
              dateRange: {
                dateFrom: moment().startOf("week").format("YYYY-MM-DD"),
                dateTo: moment().format("YYYY-MM-DD"),
              },
              businessMode: "group",
            })
          );
          break;

        case "month":
          customRange && setCustomRange(false);
          dispatch(
            getGraphData({
              dateMode: "month",
              dateRange: {
                dateFrom: moment().startOf("month").format("YYYY-MM-DD"),
                dateTo: moment().format("YYYY-MM-DD"),
              },
              businessMode: "group",
            })
          );
          break;

        case "year":
          customRange && setCustomRange(false);
          dispatch(
            getGraphData({
              dateMode: "year",
              dateRange: {
                dateFrom: moment().startOf("year").format("YYYY-MM-DD"),
                dateTo: moment().format("YYYY-MM-DD"),
              },
              businessMode: "group",
            })
          );
          break;

        case "custom":
          setCustomRange(true);
          break;

        default:
          customRange && setCustomRange(false);
          dispatch(
            getGraphData({
              dateMode: "today",
              dateRange: {
                dateFrom: moment().format("YYYY-MM-DD"),
                dateTo: moment().format("YYYY-MM-DD"),
              },
              businessMode: "group",
            })
          );
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter]);

  //Sales Report Graph -----------------------------------------------------------------------------------------

  const GRAPH_COLORS: { tw: string; hx: string }[] = [
    { tw: "sky-500", hx: "#0ea5e9" },
    { tw: "orange-500", hx: "#ea580c" },
    { tw: "blue-400", hx: "#60a5fa" },
    { tw: "green-400", hx: "#22c55e" },
    { tw: "indigo-600", hx: "#5850ec" },
    { tw: "purple-400", hx: "#c084fc" },
    { tw: "yellow-300", hx: "#fde047" },
    { tw: "yellow-500", hx: "#ca8a04" },
    { tw: "red-200", hx: "#fecaca" },
    { tw: "orange-300", hx: "#fdba74" },
    { tw: "blue-500", hx: "#2563eb" },
    { tw: "green-200", hx: "#86efac" },
    { tw: "indigo-300", hx: "#a5b4fc" },
    { tw: "purple-800", hx: "#6b21a8" },
  ];

  const labels: { idx: number; name: string; color: string }[] = [];
  const profitLabel: string[] = [];
  const salesLabel: string[] = [];
  const incomesLabel: string[] = [];
  const salesProfit: number[] = [];
  const salesCost: number[] = [];
  const sales: number[] = [];
  const incomes: number[] = [];
  const colorSalesPie: string[] = [];
  const colorIncomesPie: string[] = [];
  //-------------------------------------------------------------------------------------------

  //Manage Filter business button ------------------------------------------------------------------------
  const [inactiveBusiness, setInactiveBusiness] = useState<number[]>([]);

  const filterBusiness = (idx: number) => {
    const index = inactiveBusiness.findIndex((item) => item === idx);
    if (index !== -1) {
      setInactiveBusiness(inactiveBusiness.filter((item) => item !== idx));
    } else {
      setInactiveBusiness([...inactiveBusiness, idx]);
    }
  };

  const [pieStatus, setPieStatus] = useState<"incomes" | "sales" | null>(null);

  const totals: { sales: number; incomes: number } = useMemo(() => {
    const sales =
      graphsData?.groupData?.reduce((total, value, idx) => {
        if (!inactiveBusiness.includes(idx)) {
          return (
            total +
            convertCurrency(
              {
                price: value.totalSalesMainCurerncy,
                codeCurrency: mainCurrency,
              },
              activeCurrency
            ).price!
          );
        }
        return total;
      }, 0) ?? 0;

    const incomes =
      graphsData?.groupData?.reduce((total, value, idx) => {
        if (!inactiveBusiness.includes(idx)) {
          return (
            total +
            convertCurrency(
              {
                price: value.totalIncomesMainCurrency,
                codeCurrency: mainCurrency,
              },
              activeCurrency
            ).price!
          );
        }
        return total;
      }, 0) ?? 0;

    if (incomes !== 0 && pieStatus !== "sales") {
      setPieStatus("incomes");
    } else if (sales !== 0 && pieStatus !== "incomes") {
      setPieStatus("sales");
    } else {
      setPieStatus(null);
    }

    return { sales, incomes };
  }, [graphsData?.groupData, inactiveBusiness, pieStatus, activeCurrency]);

  graphsData?.groupData?.length !== 0 &&
    graphsData?.groupData?.forEach((data, idx) => {
      let pickedColor = idx;
      const ratio = Math.floor(idx / GRAPH_COLORS.length);
      if (ratio > 0) {
        pickedColor = idx - Math.round(ratio * GRAPH_COLORS.length);
      }
      if (
        data.grossProfit !== 0 ||
        data.totalCost !== 0 ||
        data.totalSalesMainCurerncy !== 0 ||
        data.totalIncomesMainCurrency !== 0
      ) {
        labels.push({
          idx,
          name: data.name,
          color: GRAPH_COLORS[pickedColor].tw,
        });
      }
      if (
        (data.grossProfit !== 0 || data.totalCost !== 0) &&
        !inactiveBusiness.includes(idx)
      ) {
        profitLabel.push(data.name);
        salesProfit.push(
          convertCurrency(
            { price: data.grossProfit, codeCurrency: mainCurrency },
            activeCurrency
          ).price!
        );
        salesCost.push(
          convertCurrency(
            { price: data.totalCost, codeCurrency: mainCurrency },
            activeCurrency
          ).price!
        );
      }
      if (
        data.totalSalesMainCurerncy !== 0 &&
        !inactiveBusiness.includes(idx)
      ) {
        salesLabel.push(data.name);
        sales.push(data.totalSalesMainCurerncy);
        colorSalesPie.push(GRAPH_COLORS[pickedColor].hx);
      }
      if (
        data.totalIncomesMainCurrency !== 0 &&
        !inactiveBusiness.includes(idx)
      ) {
        incomesLabel.push(data.name);
        incomes.push(data.totalIncomesMainCurrency);
        colorIncomesPie.push(GRAPH_COLORS[pickedColor].hx);
      }
    });

  //---------------------------------------------------------------------------------------------------

  const btnInfo = [
    { value: "yesterday", label: "Ayer" },
    { value: "today", label: "Hoy" },
    { value: "week", label: "Esta semana" },
    { value: "month", label: "Este mes" },
    { value: "year", label: "Este año" },
    { value: "custom", label: "Personalizado" },
  ];

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    dispatch(
      getGraphData({
        dateMode: "custom",
        dateRange: {
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
        },
        businessMode: "group",
      })
    );
  };

  let dateRange: { dateFrom?: string; dateTo: string } | null = null;
  switch (graphsData?.dateMode) {
    case "yesterday":
      dateRange = {
        dateTo: moment().subtract(1, "d").format("D [de] MMMM"),
      };
      break;

    case "week":
      dateRange = {
        dateFrom: moment().startOf("week").format("D [de] MMMM"),
        dateTo: moment().format("D [de] MMMM"),
      };
      break;

    case "month":
      dateRange = {
        dateFrom: moment().startOf("month").format("D [de] MMMM"),
        dateTo: moment().format("D [de] MMMM"),
      };
      break;

    case "year":
      dateRange = {
        dateFrom: moment().startOf("year").format("DD/MM/YYYY"),
        dateTo: moment().format("DD/MM/YYYY"),
      };
      break;

    default:
      dateRange = {
        dateTo: moment().format("D [de] MMMM"),
      };
      break;
  }
  const getTotalIncomeFunction = (Array: any) => {
    let incomesSummary: any = {};

    Array?.forEach((item: { totalIncomes: any[] }) => {
      item.totalIncomes.forEach(
        (income: { amount: any; codeCurrency: any; paymentWay: any }) => {
          const { amount, codeCurrency, paymentWay } = income;

          if (!incomesSummary[codeCurrency]) {
            incomesSummary[codeCurrency] = {
              Cash: 0,
              Transfer: 0,
            };
          }

          if (paymentWay === "CASH") {
            incomesSummary[codeCurrency].Cash += amount;
          } else if (paymentWay === "TRANSFER") {
            incomesSummary[codeCurrency].Transfer += amount;
          }
        }
      );
    });

    // Convertir el objeto a un arreglo con la estructura deseada
    let incomesSummaryArray = Object.keys(incomesSummary).map(
      (codeCurrency) => ({
        codeCurrency,
        cash: incomesSummary[codeCurrency].Cash,
        transfer: incomesSummary[codeCurrency].Transfer,
      })
    );

    // Rellenar con 0 las monedas que no tengan valores en Cash o en Transfer
    return (incomesSummaryArray = incomesSummaryArray.map((item) => ({
      ...item,
      cash: item.cash || 0,
      transfer: item.transfer || 0,
    })));
  };

  //@ts-ignore
  const totalIncomes: Array<{
    codeCurrency: string;
    transfer: number;
    cash: number;
  }> = getTotalIncomeFunction(graphsData?.groupData);

  const [selectedIncome, setselectedIncome] = useState<string>("general");

  const chartRef = useRef();

  return (
    <div className="pb-10">
      <div className="flex-col w-full py-5">
        <div className="flex">
          <InlineRadio
            data={btnInfo}
            name="timeFilter"
            control={control}
            defaultValue={"today"}
            // defaultValue={graphsData?.dateMode ?? "today"}
          />
        </div>

        <div className="flex justify-center gap-3">
          {customRange || graphsData?.dateMode === "custom" ? (
            <>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="block md:flex gap-3 py-1 "
              >
                <DateInput
                  name="dateFrom"
                  label="Desde"
                  control={control}
                  defaultValue={graphsData?.dateRange?.dateFrom}
                  rules={{ required: "inserte una fecha de inicio" }}
                  untilToday
                />
                <DateInput
                  name="dateTo"
                  label="Hasta"
                  control={control}
                  defaultValue={
                    graphsData?.dateRange?.dateTo ??
                    moment().format("YYYY-MM-DD")
                  }
                  rules={{ required: "inserte una fecha de fin" }}
                  untilToday
                />
                <div className="flex items-end mb-2">
                  <Button name="Aplicar" type="submit" color="slate-600" />
                </div>
              </form>
            </>
          ) : (
            <div className="inline-flex gap-5 items-center justify-center py-3">
              {dateRange && (
                <>
                  {dateRange.dateFrom && (
                    <>
                      <div className="border border-gray-300 py-1 px-2 rounded-md">
                        {dateRange.dateFrom}
                      </div>
                      <ChevronRightIcon className="h-5 text-gray-400" />{" "}
                    </>
                  )}
                  <div className="border border-gray-300 py-1 px-2 rounded-md">
                    {dateRange.dateTo}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <SpinnerLoading />
      ) : (
        <>
          <div className="flex justify-center items-center py-10 gap-5">
            {availableCurrencies.map((curr, index) => {
              return (
                <Button
                  key={index}
                  action={() => {
                    setActiveCurrency(curr.code);
                  }}
                  color={activeCurrency === curr.code ? "slate-600" : "white"}
                  textColor={
                    activeCurrency === curr.code ? "white" : "slate-600"
                  }
                  name={curr.code}
                />
              );
            })}
          </div>

          <div className="inline-flex pb-5 gap-2 justify-center w-full">
            {labels.map((item, idx) => {
              const color = item.color;
              return (
                <button
                  key={idx}
                  className={`border border-gray-400 p-1 shadow-md rounded-lg bg-${color} text-xs ${
                    inactiveBusiness.includes(item.idx) ? "line-through" : ""
                  }`}
                  onClick={() => filterBusiness(item.idx)}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
          {/* -------------------------------------------------- */}
          <div>
            {pieStatus !== null && (
              <div className="flex flex-col md:flex-row items-center justify-center w-full">
                {/* Grafico de Pastel */}
                <div className="mr-0 md:mr-10 ">
                  <div className="inline-flex justify-center items-center py-3 w-full gap-2">
                    <p className="font-semibold text-gray-500">
                      Total de ingresos
                    </p>
                    <GenericToggle
                      currentState={pieStatus === "sales"}
                      changeState={() =>
                        pieStatus === "sales"
                          ? setPieStatus("incomes")
                          : setPieStatus("sales")
                      }
                    />
                    <p className="font-semibold text-gray-700">
                      Total de ventas
                    </p>
                  </div>

                  <div className="mb-20 flex-col justify-center h-96">
                    <h3 className="text-center text-gray-600 font-semibold pb-2">
                      {pieStatus === "incomes"
                        ? "Total de ingresos"
                        : "Total de ventas"}
                    </h3>
                    <div className="flex justify-center font-semibold pb-2">
                      {formatPrice(
                        pieStatus === "incomes"
                          ? convertCurrency(
                              {
                                price: totals.incomes,
                                codeCurrency: mainCurrency,
                              },
                              activeCurrency
                            )
                          : convertCurrency(
                              {
                                price: totals.sales!,
                                codeCurrency: mainCurrency,
                              },
                              activeCurrency
                            )
                      )}
                    </div>
                    <Pie
                      ref={chartRef}
                      className={`${
                        pieStatus === "incomes" ? "cursor-pointer" : ""
                      }`}
                      onClick={(event) => {
                        if (pieStatus === "incomes") {
                          //@ts-ignore
                          /*setselectedIncome(
                            graphsData?.groupData?.find(
                              (business) =>
                                business.totalIncomesMainCurrency ===
                                getElementAtEvent(chartRef?.current!, event)[0]
                                  .element.$context.parsed
                            )?.name
                          );*/
                        }
                      }}
                      data={{
                        labels:
                          pieStatus === "incomes" ? incomesLabel : salesLabel,
                        datasets: [
                          {
                            label: "Ventas totales",
                            data:
                              pieStatus === "incomes"
                                ? incomes.map(
                                    (itm) =>
                                      convertCurrency(
                                        {
                                          price: itm,
                                          codeCurrency: mainCurrency,
                                        },
                                        activeCurrency
                                      ).price
                                  )
                                : sales.map(
                                    (itm) =>
                                      convertCurrency(
                                        {
                                          price: itm,
                                          codeCurrency: mainCurrency,
                                        },
                                        activeCurrency
                                      ).price
                                  ),
                            backgroundColor:
                              pieStatus === "incomes"
                                ? colorIncomesPie
                                : colorSalesPie,
                            datalabels: {
                              color: "black",
                              formatter: (_, ctx) => {
                                return `${
                                  pieStatus === "incomes"
                                    ? incomesLabel[ctx.dataIndex]
                                    : salesLabel[ctx.dataIndex]
                                }`;
                              },
                            },
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          legend: { display: false },
                          datalabels: {
                            display: true,
                            anchor: "center",
                          },
                        },
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </div>

                {/* Total de ingresos */}

                <div className="relative border-2 border-slate-300 rounded-md ml-4 mr-4 md:mr-0 md:ml-10">
                  {selectedIncome !== "general" && (
                    <div className="absolute top-4 right-4">
                      <Button
                        name="Ver general"
                        type="button"
                        action={() => setselectedIncome("general")}
                        color="slate-600"
                      />
                    </div>
                  )}
                  <table className="border-b border-gray-200  h-auto w-96 p-4 m-4 divide-y divide-gray-300">
                    <thead>
                      <tr className="font-medium text-gray-900 p-4 w-full">
                        <th>
                          {selectedIncome === "general"
                            ? "Total de ingresos"
                            : `Total de ingresos en ${selectedIncome}`}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                          {/* Monedas a mostrar */}
                          {selectedIncome === "general" ? (
                            <div className="flex flex-col w-full px-8">
                              {totalIncomes !== undefined &&
                                totalIncomes.map(
                                  (
                                    element: {
                                      codeCurrency: string;
                                      transfer: number;
                                      cash: number;
                                    },
                                    idx
                                  ) => (
                                    <div
                                      key={idx}
                                      className="flex w-full items-center justify-between my-5"
                                    >
                                      <p className="font-bold w-1/3">
                                        {element.codeCurrency}
                                      </p>
                                      <div className="flex flex-col items-center justify-end w-2/3">
                                        {element.transfer > 0 && (
                                          <p className="my-1 font-bold">
                                            Transferencia
                                          </p>
                                        )}
                                        {element.cash > 0 && (
                                          <p className="my-1 font-bold">
                                            Efectivo
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                            </div>
                          ) : (
                            <div className="flex flex-col w-full px-8">
                              {getTotalIncomeFunction(
                                graphsData?.groupData?.filter(
                                  (itm) => itm.name === selectedIncome
                                )
                              )?.map(
                                (
                                  element: {
                                    codeCurrency: string;
                                    transfer: number;
                                    cash: number;
                                  },
                                  idx
                                ) => (
                                  <div
                                    key={idx}
                                    className="flex w-full items-center justify-between my-5"
                                  >
                                    <p className="font-bold w-1/3">
                                      {element.codeCurrency}
                                    </p>
                                    <div className="flex flex-col items-center justify-end w-2/3">
                                      {element.transfer > 0 && (
                                        <p className="my-1 font-bold">
                                          Transferencia
                                        </p>
                                      )}
                                      {element.cash > 0 && (
                                        <p className="my-1 font-bold">
                                          Efectivo
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                          {/* Precios a mostrar */}
                          {selectedIncome === "general" ? (
                            <div className="flex flex-col w-full px-8">
                              {totalIncomes !== undefined &&
                                totalIncomes.map(
                                  (
                                    element: {
                                      codeCurrency: string;
                                      transfer: number;
                                      cash: number;
                                    },
                                    idx
                                  ) => (
                                    <div
                                      key={idx}
                                      className="flex flex-col items-end justify-center my-5"
                                    >
                                      {element.transfer > 0 && (
                                        <p className="my-1 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0 font-bold">
                                          {printPriceWithCommasAndPeriods(
                                            element.transfer.toFixed(2)
                                          )}
                                        </p>
                                      )}
                                      {element.cash > 0 && (
                                        <p className="my-1 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0 font-bold">
                                          {printPriceWithCommasAndPeriods(
                                            element.cash.toFixed(2)
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  )
                                )}
                            </div>
                          ) : (
                            <div className="flex flex-col w-full px-8">
                              {getTotalIncomeFunction(
                                graphsData?.groupData?.filter(
                                  (itm) => itm.name === selectedIncome
                                )
                              )?.map(
                                (
                                  element: {
                                    codeCurrency: string;
                                    transfer: number;
                                    cash: number;
                                  },
                                  idx
                                ) => (
                                  <div
                                    key={idx}
                                    className="flex flex-col items-end justify-end my-5"
                                  >
                                    {element.transfer > 0 && (
                                      <p className="my-1 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0 font-bold">
                                        {printPriceWithCommasAndPeriods(
                                          element.transfer.toFixed(2)
                                        )}
                                      </p>
                                    )}
                                    {element.cash > 0 && (
                                      <p className="my-1 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0 font-bold">
                                        {printPriceWithCommasAndPeriods(
                                          element.cash.toFixed(2)
                                        )}
                                      </p>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------- */}

          <div className="flex-col justify-center h-96 mb-10">
            {graphsData?.groupData?.reduce(
              (total, items) => total + items.grossProfit,
              0
            ) === 0 ||
            graphsData?.groupData?.reduce(
              (total, items) => total + items.totalCost,
              0
            ) === 0 ? (
              ""
            ) : (
              <Chart
                data={{
                  labels: profitLabel,
                  datasets: [
                    {
                      yAxisID: "y",
                      label: "Ganancia",
                      data: salesProfit ?? 0,
                      backgroundColor: "rgba(2, 2, 253, 0.578)",
                      barPercentage: 0.6,
                    },
                    {
                      yAxisID: "y",
                      label: "Costo",
                      data: salesCost ?? 0,
                      backgroundColor: "rgba(255, 0, 0, 0.507)",
                      barPercentage: 0.6,
                    },
                  ],
                }}
                type="bar"
                options={{
                  plugins: {
                    legend: {
                      position: "right",
                    },
                    datalabels: {
                      display: false,
                    },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: "y" as const,
                  scales: {
                    x: {
                      min: 0,
                    },
                    y: {
                      stacked: false,
                    },
                  },
                }}
              />
            )}
          </div>

          {graphsData?.businessData &&
            !(
              graphsData?.businessData?.maxValue === 0 &&
              graphsData?.businessData?.minValue === 0
            ) && (
              <>
                <div className="w-full px-5 max-w-7xl m-auto">
                  <Line
                    data={{
                      datasets: [
                        {
                          label: "Ventas",
                          data: graphsData?.businessData?.totalSales.map(
                            (itm) =>
                              convertCurrency(
                                { price: itm, codeCurrency: mainCurrency },
                                activeCurrency
                              ).price
                          ),
                          tension: 0.3,
                          borderColor: "rgb(81, 154, 68)",
                          pointRadius: 2,
                          backgroundColor: "rgb(160, 200, 154,0.3)",
                        },
                        {
                          label: "Costos",
                          data: graphsData.businessData.totalCost.map(
                            (itm) =>
                              convertCurrency(
                                { price: itm, codeCurrency: mainCurrency },
                                activeCurrency
                              ).price
                          ),
                          tension: 0.3,
                          borderColor: "rgb(115, 27, 10)",
                          pointRadius: 3,
                          backgroundColor: "rgb(209, 44, 10,0.3)",
                        },
                        {
                          label: "Ganancia Bruta",
                          data: graphsData?.businessData?.grossProfit.map(
                            (itm) =>
                              convertCurrency(
                                { price: itm, codeCurrency: mainCurrency },
                                activeCurrency
                              ).price
                          ),
                          tension: 0.3,
                          borderColor: "rgb(9, 106, 106)",
                          pointRadius: 4,
                          backgroundColor: "rgb(15, 216, 216,0.3)",
                        },
                      ],
                      labels: graphsData?.businessData?.axisLabel,
                    }}
                    options={{
                      responsive: true,
                      events: ["mousemove", "click"],
                      scales: {
                        y: {
                          min: getMaxValue(graphsData!.businessData!.minValue),
                          max: getMaxValue(graphsData!.businessData!.maxValue),
                          ticks: {
                            callback(tickValue: any) {
                              return "$" + prettyNumber(Number(tickValue));
                            },
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          display: true,
                        },
                        datalabels: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            title(tooltipItems: any) {
                              return `${tooltipItems[0].dataset?.label} ${tooltipItems[0].label}`;
                            },
                            label(item: any) {
                              return formatPrice({
                                price: Number(item.raw),
                                codeCurrency: activeCurrency,
                              });
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </>
            )}
        </>
      )}
    </div>
  );
};

const HomeProduction = () => {
  const { getHomeData, getOrder, allOrders, order, homeLoading, isLoading } =
    useServerOrderProd();
  const { control, watch } = useForm();

  const activeOrder = watch("activeOrder");
  useEffect(() => {
    if (allOrders.length === 0) {
      getHomeData();
    } else {
      getOrder(activeOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder]);

  //Data for buttons filter ----------------------------------------------------------------------------
  const activeOrdersData: InlineRadioData[] = [];
  allOrders.map((item) =>
    activeOrdersData.push({
      label: moment(item.createdAt).format("DD [de] MMMM"),
      value: item.id,
    })
  );
  //----------------------------------------------------------------------------------------------------

  //Graph data --------------------------------------------------------------------------------------------
  const labels: string[] = ["Producción Total"];
  const data: { part: number; total: number; percent: number }[] = [
    {
      part: order?.productionOrder.totalProduced ?? 0,
      total: order?.productionOrder.totalGoalQuantity ?? 1,
      percent: getPercent(
        order?.productionOrder.totalProduced ?? 0,
        order?.productionOrder.totalGoalQuantity ?? 1
      ),
    },
  ];
  const colors: string[] = ["rgb(69, 38, 225)"];

  order?.endProducts?.forEach((item) => {
    labels.push(item.name);
    data.push({
      part: item.realProduced,
      total: item.goalQuantity,
      percent: getPercent(item.realProduced, item.goalQuantity),
    });
    colors.push("#858ae8");
  });

  //-------------------------------------------------------------------------------------------------------

  if (homeLoading) return <SpinnerLoading text="Cargando datos ..." />;
  return (
    <div className="">
      <div className="my-5">
        <InlineRadio
          data={activeOrdersData}
          name="activeOrder"
          control={control}
          defaultValue={activeOrdersData[0]?.value}
          adjustContent
        />
      </div>
      <div className="flex">
        {isLoading ? (
          <div className="flex justify-center w-full">
            <SpinnerLoading text="Cargando datos de la orden ..." />
          </div>
        ) : allOrders.length === 0 ? (
          <div className="flex justify-center w-full">
            <EmptyList
              title="Si datos que mostrar"
              subTitle="En este momento no hay órdenes activas"
            />
          </div>
        ) : (
          <Chart
            data={{
              labels: labels,
              datasets: [
                {
                  yAxisID: "y",
                  label: "Estado de Producción",
                  data: data.map((item) => item.percent),
                  backgroundColor: colors,
                  datalabels: {
                    color: "white",
                    formatter: (value, ctx) =>
                      `${data[ctx.dataIndex].part} / ${
                        data[ctx.dataIndex].total
                      } (${data[ctx.dataIndex].percent}%)`,
                  },
                },
              ],
            }}
            style={{ height: 100, display: "flex" }}
            type="bar"
            options={{
              plugins: {
                datalabels: {
                  display: true,
                },
              },
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: "y" as const,
              scales: {
                x: {
                  max: 100,
                  min: 0,
                },
              },
            }}
          />
        )}
      </div>
    </div>
  );
};

const HomeCommon = () => {
  const { graphsData, loading } = useAppSelector((state) => state.auxiliar);
  const { control, watch } = useForm();
  const dispatch = useAppDispatch();
  const { business } = useAppSelector((state) => state.init);
  const { mainCurrency, availableCurrencies } = business!;
  const { convertCurrency, formatPrice } = useProduct();

  const [activeCurrency, setActiveCurrency] = useState<string>(mainCurrency);

  const dateFilter = watch("dateFilter") ?? graphsData?.dateMode ?? "week";

  useEffect(() => {
    if (dateFilter !== graphsData?.dateMode || !graphsData?.businessData) {
      dispatch(getGraphData({ businessMode: "single", dateMode: dateFilter }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  //Data for MostSelled table ------------------------------------------------------------------------
  const titles = [
    "Nombre",
    "Precio de Venta",
    "Cantidad Vendida",
    "Cantidad Disponible",
  ];
  let displayData: Array<DataTableInterface> = [];
  graphsData?.businessData?.mostSelled.map((item) =>
    displayData.push({
      payload: {
        Nombre: item.name,
        "Precio de Venta": `${item.prices[0].price} ${item.prices[0].codeCurrency}`,
        "Cantidad Vendida": item.totalSale,
        "Cantidad Disponible": item.stockLimit ? (
          item.amountRemain
        ) : (
          <UnlimitedBadge />
        ),
      },
    })
  );

  //---------------------------------------------------------------------------------------------------

  //Btn info --------------------------------------------------------------
  const btnInfo = [
    { value: "week", label: "Esta semana" },
    { value: "month", label: "Este mes" },
    { value: "year", label: "Este año" },
  ];
  //--------------------------------------------------------------------------

  //Apellido tendencia
  const rangeName = () => {
    switch (graphsData?.dateMode) {
      case "week":
        return "semanal";
      case "month":
        return "mensual";
      case "year":
        return "anual";
      default:
        break;
    }
  };

  const lineTotals =
    (graphsData?.businessData?.totalCost?.reduce(
      (total, itm) => total + itm,
      0
    ) ?? 0) +
    (graphsData?.businessData?.totalSales?.reduce(
      (total, itm) => total + itm,
      0
    ) ?? 0) +
    (graphsData?.businessData?.grossProfit?.reduce(
      (total, itm) => total + itm,
      0
    ) ?? 0) +
    (graphsData?.businessData?.totalIncomes?.reduce(
      (total, itm) => total + itm,
      0
    ) ?? 0);

  const dinamicData = useMemo(() => {
    const minAxisValue = convertCurrency(
      { price: graphsData?.businessData?.minValue, codeCurrency: mainCurrency },
      activeCurrency
    ).price;
    const maxAxisValue = convertCurrency(
      { price: graphsData?.businessData?.maxValue, codeCurrency: mainCurrency },
      activeCurrency
    ).price;

    return {minAxisValue, maxAxisValue}
  }, [activeCurrency, graphsData]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="col-span-2">
        <div className="sm:flex sm:w-3/4 m-auto">
          <InlineRadio
            data={btnInfo}
            name="dateFilter"
            control={control}
            defaultValue={graphsData?.dateMode ?? "week"}
          />
        </div>
        {loading ? (
          <SpinnerLoading className="h-[24.1rem]" />
        ) : (
          <div>
            {lineTotals !== 0 && (
              <div className="flex justify-center items-center pb-5 gap-5">
                {availableCurrencies.map((curr, index) => {
                  return (
                    <Button
                      key={index}
                      action={() => {
                        setActiveCurrency(curr.code);
                      }}
                      color={
                        activeCurrency === curr.code ? "slate-600" : "white"
                      }
                      textColor={
                        activeCurrency === curr.code ? "white" : "slate-600"
                      }
                      name={curr.code}
                    />
                  );
                })}
              </div>
            )}

            {graphsData?.dateRange && (
              <div className="flex justify-center items-center pb-5 gap-5">
                <div className="border border-gray-300 py-1 px-2 rounded-md">
                  {moment(graphsData?.dateRange.dateFrom).format(
                    graphsData.dateMode === "year"
                      ? "D [de] MMMM YYYY"
                      : "D [de] MMMM"
                  )}
                </div>
                <ChevronRightIcon className="h-5 text-gray-400" />{" "}
                <div className="border border-gray-300 py-1 px-2 rounded-md">
                  {moment(graphsData?.dateRange.dateTo).format(
                    graphsData.dateMode === "year"
                      ? "D [de] MMMM YYYY"
                      : "D [de] MMMM"
                  )}
                </div>
              </div>
            )}

            {lineTotals !== 0 && (
              <Line
                style={{ maxHeight: "22rem" }}
                data={{
                  datasets: [
                    {
                      label: "Ventas",
                      data: graphsData?.businessData?.totalSales.map(
                        (itm) =>
                          convertCurrency(
                            { price: itm, codeCurrency: mainCurrency },
                            activeCurrency
                          ).price
                      ),
                      tension: 0.3,
                      borderColor: "rgb(81, 154, 68)",
                      pointRadius: 2,
                      backgroundColor: "rgb(160, 200, 154,0.3)",
                    },
                    {
                      label: "Costos",
                      data: graphsData?.businessData?.totalCost.map(
                        (itm) =>
                          convertCurrency(
                            { price: itm, codeCurrency: mainCurrency },
                            activeCurrency
                          ).price
                      ),
                      tension: 0.3,
                      borderColor: "rgb(115, 27, 10)",
                      pointRadius: 3,
                      backgroundColor: "rgb(209, 44, 10,0.3)",
                    },
                    {
                      label: "Ganancia Bruta",
                      data: graphsData?.businessData?.grossProfit.map(
                        (itm) =>
                          convertCurrency(
                            { price: itm, codeCurrency: mainCurrency },
                            activeCurrency
                          ).price
                      ),
                      tension: 0.3,
                      borderColor: "rgb(9, 106, 106)",
                      pointRadius: 4,
                      backgroundColor: "rgb(15, 216, 216,0.3)",
                    },
                    {
                      label: "Ingresos",
                      data: graphsData?.businessData?.totalIncomes.map(
                        (itm) =>
                          convertCurrency(
                            { price: itm, codeCurrency: mainCurrency },
                            activeCurrency
                          ).price
                      ),
                      tension: 0.3,
                      pointRadius: 4,
                      backgroundColor: "rgba(234, 94, 39, 0.2)",
                      borderColor: "rgba(234, 94, 39, 1)",
                    },
                  ],
                  labels: graphsData?.businessData?.axisLabel,
                }}
                options={{
                  responsive: true,
                  events: ["mousemove", "click"],
                  scales: {
                    y: {
                      min: getMaxValue(dinamicData.minAxisValue),
                      max: getMaxValue(dinamicData.maxAxisValue),
                      ticks: {
                        callback(tickValue) {
                          return "$" + prettyNumber(Number(tickValue));
                        },
                      },
                    },
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        title(tooltipItems) {
                          return `${tooltipItems[0].dataset?.label} ${tooltipItems[0].label}`;
                        },
                        label(item) {
                          return formatPrice({
                            price: Number(item.raw),
                            codeCurrency: activeCurrency,
                          });
                        },
                      },
                    },
                    legend: {
                      display: true,
                    },
                    datalabels: {
                      display: false,
                    },
                  },
                }}
              />
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-6">
        <div className="h-fit ">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">
              Tendencia {rangeName()}
            </h1>
            <PresentationChartLineIcon className="h-6 animate-pulse" />
          </div>
          <div className="border border-gray-200 bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 max-h-[22rem]">
            {displayData.length === 0 ? (
              <EmptyList />
            ) : (
              <GenericTable
                tableTitles={titles}
                tableData={displayData}
                loading={loading}
              />
            )}
          </div>
        </div>
        <PendingDispatch businessId={business?.id!} />
      </div>
      <div className="flex flex-col gap-6">
        <LastOperationsCard />
        <UnderLimitProductsCard />
      </div>
    </div>
  );
};

export default function HomePage() {
  const { business, user } = useAppSelector((state) => state.init);

  if (
    business?.mode === "GROUP" &&
    user?.roles.some((rol: { code: string }) => rol.code === "GROUP_OWNER")
  ) {
    return <HomeGroup />;
  } else if (business?.type === "PRODUCTION") {
    return <HomeProduction />;
  } else {
    return <HomeCommon />;
  }
}
