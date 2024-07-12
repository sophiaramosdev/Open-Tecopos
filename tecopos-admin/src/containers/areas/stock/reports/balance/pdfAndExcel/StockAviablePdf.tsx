//@ts-nocheck

import DocumentPage from "../../../../../../components/pdf/DocumentPage";
import TableTemplate from "../../../../../../components/pdf/TableTemplate";
import { translateMeasure } from "../../../../../../utils/translate";
import { StockAviable } from "../../../../../../interfaces/ServerInterfaces";
import { formatCurrency } from "../../../../../../utils/helpers";

function StockAviablePdf({
  stockAviable,
  is_only_category,
  groupedAmounts,
  totalCategories,
  permissions,
  totalProducts
}: StockAviable | any) {
  //Data for table------------------------------------------

  let stockAviableData: any[] = !is_only_category
    ? stockAviable?.products?.map((item: any) => {
        let productData = {
          Producto: item.productName ?? "-",
          "U/M": translateMeasure(item.measure) ?? "-",
        };
        item.stocks.forEach((stock: any) => {
          productData[stock.stockName] = stock.quantity;
        });

        productData = {
          ...productData,
          Disponibilidad: item.disponibility ?? "-",
          ...(permissions && {
            "Costo total": formatCurrency(item.total_cost, stockAviable.costCurrency, 2),
            "Venta estimada": formatCurrency(item.total_estimated_sales, stockAviable.costCurrency, 2),
            "Ganancia estimada": formatCurrency(item.total_estimated_profits, stockAviable.costCurrency, 2),
          }),
        };

        return productData;
      })
    : stockAviable?.categories?.map((item: any) => ({
        Categorías: item?.salesCategoryName ?? "-",
        Disponibilidad: item.total_disp ?? "-",
        ...(permissions && {
          "Costo total": formatCurrency(item.total_cost, stockAviable.costCurrency, 2),
          "Venta estimada": formatCurrency(item.total_estimated_sales, stockAviable.costCurrency, 2),
          "Ganancia estimada": formatCurrency(item.total_estimated_profits, stockAviable.costCurrency, 2),
        }),
      }));

  if (stockAviable?.products.length !== 0 && !is_only_category) {
    let totalRow: any = {
      Producto: "Total" ?? "-",
    };

    totalRow["U/M"] =
      groupedAmounts?.map((item: any) => {
        return translateMeasure(item.measure);
      }) ?? "-";
    // Fill in blank spaces in totals to show the values in their respective columns
    stockAviable?.products[0].stocks.forEach((stock: any) => {
      totalRow[stock.stockName] = " ";
    });

    totalRow.Disponibilidad =
      groupedAmounts?.map((item: any) => {
        return item.amount;
      }) ?? "-";

    totalRow = {
      ...totalRow,
      ...(permissions && {
        "Costo total": formatCurrency(totalProducts.total_cost, stockAviable?.costCurrency, 2),
        "Venta estimada": formatCurrency(totalProducts.total_estimated_sales, stockAviable?.costCurrency, 2),
        "Ganancia estimada": formatCurrency(totalProducts.total_estimated_profits, stockAviable?.costCurrency, 2),
      }),
    };

    stockAviableData.push(totalRow);
  } else if (stockAviable?.categories.length !== 0 && is_only_category) {
    stockAviableData.push({
      Categorías: "Total" ?? "-",
      Disponibilidad: totalCategories.total_disp ?? "-",
      ...(permissions && {
        "Costo total": formatCurrency(totalCategories.total_cost, stockAviable?.costCurrency, 2),
        "Venta estimada": formatCurrency(totalCategories.total_estimated_sales, stockAviable?.costCurrency, 2),
        "Ganancia estimada": formatCurrency(totalCategories.total_estimated_profits, stockAviable?.costCurrency, 2),
      }),
    });
  }

  //------------------------------------------------------------
  return (
    <DocumentPage orientation="landscape">
      <TableTemplate data={stockAviableData} />
    </DocumentPage>
  );
}

export default StockAviablePdf;
