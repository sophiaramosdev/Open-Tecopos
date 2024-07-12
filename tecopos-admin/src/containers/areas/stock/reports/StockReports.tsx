import { useEffect, useMemo } from "react";
import useServerArea from "../../../../api/useServerArea";
import Check from "../../../../components/forms/GenericCheck";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";

import { formatCurrency } from "../../../../utils/helpers";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../../store/hooks";
import { toast } from "react-toastify";

const StockReports = () => {
  const {
    getStockInvestmentReport,
    changeStockReportState,
    stockInvestmentReport,
    isLoading,
  } = useServerArea();
  const navigate = useNavigate();
  const { areas } = useAppSelector(state => state.nomenclator)
  const { business } = useAppSelector(state => state.init)

  useEffect(() => {
    getStockInvestmentReport();
  }, []);

  const totals = useMemo(() => {
    if (stockInvestmentReport) {
      const { costCurrency: mainCurrency, result } = stockInvestmentReport;
      const currentResult = result.filter((item) => item.active !== false);
      const totalCost = currentResult.reduce(
        (total, item) => total + item.total_cost,
        0
      );
      const totalProfit = currentResult.reduce(
        (total, item) => total + item.total_estimated_profits,
        0
      );
      const totalSale = currentResult.reduce(
        (total, item) => total + item.total_estimated_sales,
        0
      );
      return {
        payload: {
          "": "Totales",
          Almacén: "Total",
          "Costo total": (
            <p className="font-semibold">
              {formatCurrency(totalCost, business?.configurationsKey.find(elem => elem.key === "general_cost_currency")?.value, 2)}
            </p>
          ),
          "Venta estimada": (
            <p className="font-semibold">
              {formatCurrency(totalSale, mainCurrency, 2)}
            </p>
          ),
          "Ganancia estimada": (
            <p
              className={`font-semibold ${totalProfit < 0
                  ? "text-red-500"
                  : totalProfit > 0
                    ? "text-green-500"
                    : ""
                }`}
            >
              {" "}
              {formatCurrency(totalProfit, mainCurrency, 2)}
            </p>
          ),
        },
      };
    }
  }, [stockInvestmentReport]);

  //Data for table ---------------------------------------------------------------------------
  const onClickStock = (id: number) => {
    const index = areas.findIndex(area => area.id === id);
    if (index !== -1) {
      navigate(`/stocks/${id}`)
    } else {
      toast.warning("Debe cambiar de negocio para acceder a este almacén")
    }

  }
  const tableTitles = [
    "Almacén",
    "Costo total",
    "Venta estimada",
    "Ganancia estimada",
  ];
  const tableData: DataTableInterface[] = [];
  stockInvestmentReport?.result.map((item, idx) => {
    tableData.push({
      rowId: item.areaId,
      deletedRow: item.active === false,
      payload: {
        "Almacén": (<div className="inline-flex gap-2 items-center">
          <Check
            value={idx}
            checked={item?.active ?? true}
            onChange={(e) =>
              changeStockReportState(Number(e.target.value), e.target.checked)
            }
          />
          <span
            className="font-semibold text-gay-500 cursor-pointer"
            onClick={() => onClickStock(item.areaId)}
          >
            {item.areaName}
          </span>
        </div>
        ),
        "Costo total": formatCurrency(
          item.total_cost,
          business?.configurationsKey.find(elem => elem.key === "general_cost_currency")?.value,
          2
        ),
        "Venta estimada": formatCurrency(
          item.total_estimated_sales,
          stockInvestmentReport.costCurrency,
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
              stockInvestmentReport.costCurrency,
              2
            )}
          </p>
        ),
      },
    });
  });
  totals && tableData.push(totals);

  return (
    <div>
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        loading={isLoading}
      />
    </div>
  );
};

export default StockReports;
