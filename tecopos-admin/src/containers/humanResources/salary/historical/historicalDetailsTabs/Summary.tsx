import { useContext, useState } from "react";
import { DispatchContext } from "../HistoricalDetails";
import GenericList from "../../../../../components/misc/GenericList";
import { printPriceWithCommasAndPeriods } from "../../../../../utils/functions";
import { Pie } from 'react-chartjs-2';
import GenericTable, { DataTableInterface } from "../../../../../components/misc/GenericTable";
import { formatDate, formatDateWihtoutYear } from "../../../../../utils/helpers";

//@ts-ignore
const convertCurrency = (amount, exchangeRate, round = false) => {
  const convertedAmount = amount * exchangeRate;
  return round ? Math.round(convertedAmount) : convertedAmount;
};
const Summary = (props: any) => {

  const { HistoricalDetailsData } = useContext(DispatchContext);

  let accordance = 0
  let salaries = 0


  const [averageSalary, setAverageSalary] = useState<{
    highest: number;
    lower: number;
    highestPost: string;
    lowerPost: string;
  }>({
    highest: 0,
    lower: 1000000000,
    highestPost: "",
    lowerPost: "",
  })

  // Objeto para almacenar los totales acumulativos por cargo
  const totalesAcumulativos: any = {};
  HistoricalDetailsData?.salaryReportPersons.forEach(salaryReportPerson => {
    accordance += salaryReportPerson.accordance
    salaries += salaryReportPerson.totalToPay


    if (salaryReportPerson.totalToPay > averageSalary.highest) {
      setAverageSalary({
        highest: salaryReportPerson.totalToPay,
        highestPost: salaryReportPerson?.person?.post?.name,
        lower: averageSalary.lower,
        lowerPost: averageSalary.lowerPost,
      })
    } else if (salaryReportPerson.totalToPay < averageSalary.lower) {
      setAverageSalary({
        lower: salaryReportPerson.totalToPay,
        lowerPost: salaryReportPerson?.person?.post?.name,
        highest: averageSalary.highest,
        highestPost: averageSalary.highestPost,
      })
    }


    const { person: { post: { name } }, totalToPay } = salaryReportPerson;


    // Verificar si ya existe el cargo en el objeto de totales acumulativos
    if (totalesAcumulativos[name]) {
      // Si existe, acumular el totalToPay
      totalesAcumulativos[name] += totalToPay;
    } else {
      // Si no existe, crear una nueva entrada en el objeto
      totalesAcumulativos[name] = totalToPay;
    }

  })

  // Convertir el objeto de totales acumulativos a un arreglo
  const resultadoFinal = Object.keys(totalesAcumulativos).map(cargo => ({
    cargo,
    totalToPay: totalesAcumulativos[cargo]
  }));

  const dataBody = {
    "Total de ventas en el período": (printPriceWithCommasAndPeriods(HistoricalDetailsData?.totalSales)! ?? "") + " " + (HistoricalDetailsData?.codeCurrency! ?? ""),
    "Total ingresado": (printPriceWithCommasAndPeriods(HistoricalDetailsData?.totalIncomes)! ?? "") + " " + (HistoricalDetailsData?.codeCurrency! ?? ""),
    "Total bruto a pagar": <p>{(printPriceWithCommasAndPeriods(HistoricalDetailsData?.totalToPay! - HistoricalDetailsData?.totalTips!)! ?? "") + " " + (HistoricalDetailsData?.codeCurrency! ?? "")} <span className="ml-2">   {`   (${(((HistoricalDetailsData?.totalToPay! - HistoricalDetailsData?.totalTips!) / HistoricalDetailsData?.totalSales!) * 100).toFixed(2)}% con respecto al total de ventas)`}</span></p>,
    "Total de propinas": <p>{(printPriceWithCommasAndPeriods(HistoricalDetailsData?.totalTips)! ?? "") + " " + (HistoricalDetailsData?.codeCurrency! ?? "")} <span className="ml-2">{`   ${((HistoricalDetailsData?.totalTips! / HistoricalDetailsData?.totalToPay!) * 100) > 0 ? ("(" + ((HistoricalDetailsData?.totalTips! / HistoricalDetailsData?.totalToPay!) * 100).toFixed(2) + "% con respecto al total a pagar)") : ""}`}</span></p>,
    "Total a pagar (+ propinas)": <p>{(printPriceWithCommasAndPeriods(HistoricalDetailsData?.totalToPay)! ?? "") + " " + (HistoricalDetailsData?.codeCurrency! ?? "")} <span className="ml-2">   {`   (${((HistoricalDetailsData?.totalToPay! / HistoricalDetailsData?.totalSales!) * 100).toFixed(2)}% con respecto al total de ventas)`}</span></p>,
  }

  // Datos Total de Ventas
  const activeCurrency = { exchangeRate: 1 }; // Reemplaza con tu lógica para obtener la moneda activa
  const incomesLabel = ["Total neto ventas", "Total bruto a pagar"];
  const incomes = [(HistoricalDetailsData?.totalSales! - HistoricalDetailsData?.totalToPay! - HistoricalDetailsData?.totalTips!), (HistoricalDetailsData?.totalToPay! - HistoricalDetailsData?.totalTips!)];
  const colorIncomesPie = ["#FF6000", "#36A2EB"];
  // Configuración del gráfico
  const chartData = {
    labels: incomesLabel,
    datasets: [
      {
        label: "Ventas totales",
        data: incomes.map((itm) => convertCurrency(itm, activeCurrency?.exchangeRate ?? 0, true)),
        backgroundColor: colorIncomesPie,
        datalabels: {
          color: "black",
          //@ts-ignore
          formatter: (_, ctx) => {
            return `${incomesLabel[ctx.dataIndex]}`;
          },
        },
      },
    ],
  };

  // Configuración de tooltips
  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const percentage = ((value / incomes?.reduce((sum, val) => sum! + val!, 0)!) * 100).toFixed(2);
            return `${printPriceWithCommasAndPeriods(convertCurrency(value, activeCurrency?.exchangeRate ?? 0, true))} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Datos Total a pagar
  const activeCurrencyTotalToPay = { exchangeRate: 1 }; // Reemplaza con tu lógica para obtener la moneda activa
  const incomesLabelTotalToPay = ["Total bruto a pagar", "Propinas"];
  const incomesTotalToPay = [HistoricalDetailsData?.totalToPay! - HistoricalDetailsData?.totalTips!, HistoricalDetailsData?.totalTips];
  const colorIncomesPieTotalToPay = ["#FFCE56", "#36A2EB"];
  // Configuración del gráfico
  const chartDataTotalToPay = {
    labels: incomesLabelTotalToPay,
    datasets: [
      {
        label: "Ventas totales",
        data: incomesTotalToPay.map((itm) => convertCurrency(itm, activeCurrencyTotalToPay?.exchangeRate ?? 0, true)),
        backgroundColor: colorIncomesPieTotalToPay,
        datalabels: {
          color: "black",
          //@ts-ignore
          formatter: (_, ctx) => {
            return `${incomesLabelTotalToPay[ctx.dataIndex]}`;
          },
        },
      },
    ],
  };

  // Configuración de tooltips
  const chartOptionsTotalToPay = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const percentage = ((value / incomesTotalToPay?.reduce((sum, val) => sum! + val!, 0)!) * 100).toFixed(2);
            return `${printPriceWithCommasAndPeriods(convertCurrency(value, activeCurrencyTotalToPay?.exchangeRate ?? 0, true))} (${percentage}%)`;
          },
        },
      },
    },
  };

  const dataBodyThen = {
    "Cantidad de ciclos económicos": HistoricalDetailsData?.economicCycleData.length + " ciclos",
    "Nivel de conformidad": (accordance / (HistoricalDetailsData?.salaryReportPersons.length ?? 1))! ?? "",
    "Cantidad de personas procesadas": HistoricalDetailsData?.salaryReportPersons.length + ` personas  (De ellas han recibido su salario: ${HistoricalDetailsData?.salaryReportPersons.filter(person => person.isPaid).length} para un ${(HistoricalDetailsData?.salaryReportPersons.filter(person => person.isPaid).length! / HistoricalDetailsData?.salaryReportPersons.length!) * 100}%)`,
    "Salario medio": (printPriceWithCommasAndPeriods(salaries / (HistoricalDetailsData?.salaryReportPersons.length ?? 1))! ?? "") + " " + (HistoricalDetailsData?.codeCurrency! ?? ""),
    "Salario más alto": (printPriceWithCommasAndPeriods(averageSalary?.highest)! ?? "") + "    (" + (averageSalary?.highestPost ?? "Sin cargo") + ")",
    "Salario más bajo": (printPriceWithCommasAndPeriods(averageSalary?.lower)! ?? "") + "    (" + (averageSalary?.lowerPost! ?? "Sin cargo") + ")",
  }

  const tableTitlesPostTable = [
    "Nombre",
    "Cantidad",
    "Salario promedio",
    "Total",
    "%",
  ];

  const tableTitlesEconomicTable = [
    "Fecha",
    "Negocio",
    "Total ventas",
    "Total ingresos",
    "Total de personas a dividir la propina",
    "Total propinas",
    "Total de personas que trabajaron",
  ];

  const tableDataPost: DataTableInterface[] = [];
  resultadoFinal.forEach((item: { cargo: string; totalToPay: number; }, key) => {

    const personQuantity = HistoricalDetailsData?.salaryReportPersons?.filter(salaryReport => salaryReport?.person?.post?.name === item?.cargo).length

    if (item.totalToPay > 0) {
      tableDataPost.push({
        rowId: key,
        payload: {
          Nombre: item.cargo === "undefined" ? "Sin cargo" : item.cargo,
          Cantidad: personQuantity ?? 1,
          "Salario promedio": printPriceWithCommasAndPeriods(item.totalToPay / personQuantity! ?? 1),
          "Total": printPriceWithCommasAndPeriods(item.totalToPay),
          "%": ((item.totalToPay / HistoricalDetailsData?.totalToPay!) * 100).toFixed(2) + " %",
        },
      })
    }
  })
  const tableDataEconomic: DataTableInterface[] = [];
  HistoricalDetailsData?.economicCycleData.forEach(ecoCycle => {
    tableDataEconomic.push({
      rowId: ecoCycle.id,
      payload: {
        "Fecha": formatDateWihtoutYear(ecoCycle.startsAt),
        "Negocio": ecoCycle.businessName,
        "Total ventas": printPriceWithCommasAndPeriods(ecoCycle.totalSalesInMainCurrency) + " " + HistoricalDetailsData.codeCurrency,
        "Total ingresos": printPriceWithCommasAndPeriods(ecoCycle.totalIncomesInMainCurrency) + " " + HistoricalDetailsData.codeCurrency,
        "Total de personas a dividir la propina": (ecoCycle.amountPeopleToIncludeInTips !== undefined) ? (ecoCycle.amountPeopleToIncludeInTips !== undefined) ? ecoCycle.amountPeopleToIncludeInTips : "-" : "-",
        "Total propinas": printPriceWithCommasAndPeriods(ecoCycle.totalTipsInMainCurrency) + " " + HistoricalDetailsData.codeCurrency + `  ${ecoCycle.totalTipsInMainCurrency > 0 ? ("(%" + ((ecoCycle.totalTipsInMainCurrency / ecoCycle.totalSalesInMainCurrency) * 100).toFixed(2) + ")") : ""}`,
        "Total de personas que trabajaron": ecoCycle.amountPeopleWorked
      }
    })
  })

  return (
    <div className={props.show ? '' : 'hidden'}>
      <GenericList
        body={dataBody}
      // isLoading={isLoading}
      />

      <div className="w-full flex justify-evenly items-center p-4">
        <div className="flex flex-col items-center justify-center">
          <p className="text-lg font-semibold">Total ventas</p>
          <Pie data={chartData} options={chartOptions} />
        </div>

        <div className="flex flex-col items-center justify-center">
          <p className="text-lg font-semibold">Total a pagar</p>
          <Pie data={chartDataTotalToPay} options={chartOptionsTotalToPay} />
        </div>
      </div>

      <GenericList
        body={dataBodyThen}
      // isLoading={isLoading}
      />

      <p className="text-lg font-semibold p-4">Promedio de salarios por cargos</p>

      <GenericTable
        tableTitles={tableTitlesPostTable}
        tableData={tableDataPost.sort((a, b) => {
          //@ts-ignore
          const porcentajeA = parseFloat(a.payload["%"]?.replace('%', ''));
          //@ts-ignore
          const porcentajeB = parseFloat(b.payload["%"]?.replace('%', ''));

          return porcentajeB - porcentajeA;
        })}
      />

      <p className="text-lg font-semibold p-4">Ingresos por ciclos económicos</p>

      <GenericTable
        tableTitles={tableTitlesEconomicTable}
        tableData={tableDataEconomic}
      />
    </div>


  )
}

export default Summary
