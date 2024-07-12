import { Fragment } from "react";
import DocumentPage from "../components/pdf/DocumentPage";
import TableTemplate from "../components/pdf/TableTemplate";
import { SelledProductReport } from "../interfaces/InterfacesLocal";
import { formatCurrency } from "../utils/helpers";
import DocumentHeader from "../components/pdf/DocumentHeader";
import { PriceInvoiceInterface } from "../interfaces/ServerInterfaces";

interface PdfSelledInterface {
  report: SelledProductReport[];
  ecoCycle: string;
  dataByCategories: SelledProductReport[]
}

const SelledProductsPdf = ({ report, ecoCycle, dataByCategories }: PdfSelledInterface) => {

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

  return (
    <DocumentPage>
      <DocumentHeader text="Reporte de ventas" subtext={ecoCycle} />
      <>
        {report.map((elem, idx) => {
          const data = elem.products
            .map((prod) => ({
              name: prod.name,
              quantity: prod.quantity,
              totalSale: prod.totalSale,
            }))
            .concat([
              {
                name: "Subtotal",
                quantity: elem.subtotals.quantity ?? 0,
                totalSale: elem.subtotals.totalSale ?? [],
              },
            ]);
          return (
            <Fragment key={idx}>
              <TableTemplate
                tableName={elem.salesCategory}
                data={data.map((product) => ({
                  Nombre: product.name,
                  Cantidad: product.quantity,
                  "Precio total Ventas": product.totalSale.map((sale) =>
                    formatCurrency(sale.amount, sale.codeCurrency)
                  )
                }))}
                containTotals
              />
            </Fragment>
          );
        })}

        <Fragment >
          <TableTemplate
            tableName={"Totales"}
            data={[{
              Nombre: "Total",
              Cantidad: totales.quantity,
              "Precio total Ventas": totales.totalSales.map(item => `${formatCurrency(item.amount, item.codeCurrency)}`).join('  ')
            }]}
            containTotals
          />
        </Fragment>
      </>
    </DocumentPage>
  );
};

export default SelledProductsPdf;
