import React from "react";
import Button from "../../../../components/misc/Button";
import { FaRegFilePdf } from "react-icons/fa";
import { formatCurrency, generatePdf } from "../../../../utils/helpers";
import PdfSalesSummaryByCommercial from "../pdfs/PdfSalesSummaryByCommercial";

export default function SalesSummaryByCommercial({showReportDataModal}:any) {
  
  return (
    <>
      <span className="text-lg font-medium mt-4">
        Resumen de ventas por comerciales:
      </span>

      <div className="flex justify-end mb-2">
        <Button
          color="white"
          name="Exportar"
          textColor="gray-500"
          icon={<FaRegFilePdf className="h-5 text-gray-500" />}
          action={() => {
            generatePdf(
              PdfSalesSummaryByCommercial({ showReportDataModal }),
              "Resumen de ventas por comerciales:"
            );
          }}
          outline
        />
      </div>

      {showReportDataModal?.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="w-full overflow-x-auto rounded-md">
            <table className="min-w-full bg-white text-sm text-gray-800">
              <thead className="text-gray-800 bg-gray-200">
                <tr>
                  <th className="py-2 px-2 text-center">Comercial</th>
                  <th className="py-2 px-2 text-center">Importe mercancías</th>
                  <th className="py-2 px-2 text-center">Total</th>
                  <th className="py-2 px-2 text-center">
                    Cantidad de Productos
                  </th>
                  <th className="py-2 px-2 text-center">Propinas</th>
                </tr>
              </thead>
              <tbody>
                {showReportDataModal.map((order: any, index: any) => (
                  <tr key={index} className="bg-gray-100 border-b">
                    <td className="py-2 px-2 text-gray-700 text-center">
                      {order?.managedBy?.displayName || "-"}
                    </td>
                    <td className="py-2 px-2 text-gray-700 text-center">
                      {order?.prices.length > 0
                        ? order.prices.map((price: any) => (
                            <div key={price.codeCurrency}>
                              {price.price
                                ? `${formatCurrency(price.price,price.codeCurrency)}`
                                : "-"}
                            </div>
                          ))
                        : "-"}
                    </td>
                    <td className="py-2 px-2 text-gray-700 text-center">
                      {order?.totalToPay.length > 0
                        ? order.totalToPay.map((total: any) => (
                            <div key={total.codeCurrency}>
                              {total.amount
                                ? `${formatCurrency(total.amount,total.codeCurrency)}`
                                : "-"}
                            </div>
                          ))
                        : "-"}
                    </td>
                    <td className="py-2 px-2 text-gray-700 text-center">
                      {order?.amountOfProducts || "-"}
                    </td>
                    <td className="py-2 px-2 text-gray-700 text-center">
                      {order?.tipPrices.length > 0
                        ? order.tipPrices.map((tip: any) => (
                            <div key={tip.codeCurrency}>
                              {tip.amount
                                ? `${formatCurrency(tip.amount,tip.codeCurrency)}`
                                : "-"}
                            </div>
                          ))
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        "-"
      )}
    </>
  );
}
