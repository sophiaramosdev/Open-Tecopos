//@ts-nocheck
import { useEffect, useState } from "react";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/misc/GenericModal";
import { useAppSelector } from "../../../../store/hooks";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { formatCurrency, formatCurrencyWithOutCurrency, formatDateHours, generatePdf, mathOperation } from "../../../../utils/helpers";
import PdfFinancialEconomicCycleReporte from "../pdfs/PdfFinancialEconomicCycleReporte";
import { getColorCashOperation } from "../../../../utils/tailwindcss";
import moment from "moment";
import { getCashOperationSpanish } from "../../../../utils/functions";
import CalendarEconomicCycle from "./CalendarEconomicCycle";
import Toggle from "../../../../components/forms/Toggle";
import RadioGroupForm from "../../../../components/forms/RadioGroup";
import { BsCashCoin, BsCreditCard } from "react-icons/bs";


function FinancialEconomicCycleReporteModal({isFetching , financialEconomicCycleReporte , getFinancialEconomicCycleReporte , setShowModal}) {
  const { user,business } = useAppSelector((state) => state.init);


  const [filterByDateModal, setFilterByDateModal] = useState(false);
  const [econCiclSelected, setEconCiclSelected] = useState<any>();
  const [showReportDataModal, setShowReportDataModal] = useState<
    boolean | null
  >();

 //React Hook Form
  const { register, handleSubmit, control, watch ,setValue} = useForm();

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => {
    if (data.economicCycleId === undefined) {
      toast.warn("Debe seleccionar un ciclo económico"); 
      return
    }   
    getFinancialEconomicCycleReporte(data);

    if (watch("Format") !== "preview") {
      generatePdf(
        PdfFinancialEconomicCycleReporte({financialEconomicCycleReporte ,mainCurrency, costCurrency, existExchangeRates ,getCostCurrency,totalIncomes,existTotalIncomesNotInCash,existTotalIncomesInCash , user}),
        "Financial Economic Cycle"
      );
    }
  };

   //Tasa de cambio -------------------------------------------------------------------------------
   const mainCurrency = financialEconomicCycleReporte?.exchange_rates?.find(
    (rate) => rate.isMain
  )?.code;
  const costCurrency = business?.costCurrency;
  const costCurrencyExchangeRate =
    financialEconomicCycleReporte?.exchange_rates.find(
      (rate) => rate.code === costCurrency
    )?.exchangeRate;

  const getCostCurrency = () => {
    const totalSalesInMainCurrency =
      financialEconomicCycleReporte?.economicCycle?.totalSalesInMainCurrency
        .amount;

    if (costCurrencyExchangeRate && totalSalesInMainCurrency) {
      return mathOperation(
        totalSalesInMainCurrency,
        costCurrencyExchangeRate,
        "division"
      ) as number;
    } else {
     /*  toast.warn("No se encontró el tipo de cambio para la moneda de costo."); */
    }
  };
  //---------------------------------------------------------------------------------------------

  //----------------Validate data ------------------- --->
  const existExchangeRates =
    (financialEconomicCycleReporte?.exchange_rates.length || 0) !== 0;
  const existTotalIncomesInCash =
    (financialEconomicCycleReporte?.economicCycle?.totalIncomesInCash.length ||
      0) !== 0;
  const existTotalIncomesNotInCash =
    (financialEconomicCycleReporte?.economicCycle?.totalIncomesNotInCash
      .length || 0) !== 0;
  //----------------Validate data ------------------- --->

  //-----------------------------------------------------
  const totalIncomes: Array<{ codeCurrency: string, transfer: number, cash: number }> = []

    // Asegurarse de que los arreglos existen antes de intentar mapearlos
  const incomesNotInCashArray = financialEconomicCycleReporte?.economicCycle?.totalIncomesNotInCash || [];
  const incomesInCashArray = financialEconomicCycleReporte?.economicCycle?.totalIncomesInCash || [];
  
  // Crear un conjunto (set) de todos los codeCurrency presentes en ambos arreglos
  const allCurrencies = new Set([
   ...incomesNotInCashArray.map(item => item.codeCurrency),
   ...incomesInCashArray.map(item => item.codeCurrency)
  ]);
  
  // Iterar sobre todos los códigos de moneda
  allCurrencies.forEach(currency => {
    const transferData = incomesNotInCashArray.find(item => item.codeCurrency === currency);
    const cashData = incomesInCashArray.find(item => item.codeCurrency === currency);
  
    const transferAmount = transferData? transferData.amount : 0;
    const cashAmount = cashData? cashData.amount : 0;
  
    totalIncomes.push({
      codeCurrency: currency,
      transfer: transferAmount,
      cash: cashAmount
    });
  });

  //To validate whether to show modal or generate PDF.
  useEffect(() => {
    if (financialEconomicCycleReporte) {
       if (watch("Format") === "preview") {
        setShowReportDataModal(true);
      } else {
      
      }
    }
  }, [financialEconomicCycleReporte]);

  return (
    <>
           <form onSubmit={handleSubmit(onSubmit)}>
            <h2 className="text-xl font-semibold mb-6">
              Listado ampliado de cierre contable de ciclo económico
            </h2>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 items-center w-full">
                <span className="w-full">
                <Button
                 color="gray-200"
                 textColor="slate-900"
                 type="button"
                 name="Seleccionar ciclo económico"
                 outline
                 full
                 action={() => {
                  setFilterByDateModal(true);
                 }}
               />
                </span>
               { econCiclSelected?.openDate && econCiclSelected?.closedDate && 
               <span className="w-full">
               {formatDateHours(econCiclSelected?.openDate)} {(!!econCiclSelected?.openDate && !!econCiclSelected?.closedDate) ? "-" : "" } {formatDateHours(econCiclSelected?.closedDate)}
               </span>}
               
              </div>
             
              <Toggle
                name="includePendingOrder"
                title="Incluir órdenes pendientes de pago"
                defaultValue={false}
                control={control}
              ></Toggle>
              <Toggle
                name="includeAllCashOperations"
                title="Incluir operaciones de caja"
                defaultValue={false}
                control={control}
              ></Toggle>

              <RadioGroupForm
                control={control}
                label="Método de visualización"
                name={"Format"}
                rules={{
                  required: true,
                }}
                defaultValue={"PDF"}
                data={[
                  {
                    value: "PDF",
                    title: "PDF",
                    description: "Generar reporte en formato PDF",
                  },
                  {
                    value: "preview",
                    title: "Vista previa",
                    description: "",
                  },
                ]}
              />
              <div className="w-full flex justify-end gap-3 mt-4">
                <div>
                  <Button
                    color="slate-600"
                    textColor="slate-600"
                    type="submit"
                    name="Cancelar"
                    outline
                    action={() => {
                      setShowModal(false);
                    }}
                  />
                </div>
                <div>
                  <Button
                    color="slate-600"
                    type="submit"
                    name="Generar"
                    loading={isFetching}
                    disabled={isFetching}
                  />
                </div>
              </div>
            </div>
          </form>

          {filterByDateModal && (
        <Modal
          close={() => setFilterByDateModal(false)}
          state={filterByDateModal}
          size="m"
        >
          <CalendarEconomicCycle setShowDate={setFilterByDateModal} setValue={setValue} setEconCiclSelected={setEconCiclSelected} />
        </Modal>
      )}


      {showReportDataModal && (
        <Modal
          state={showReportDataModal}
          close={() => setShowReportDataModal(null)}
          size="l"
        >
          <div className="flex flex-col gap-1 text-base rounded-lg ">
            <h2 className="text-xl font-medium border-b border-gray-200 pb-2">
              Listado ampliado de cierre contable
            </h2>
            <div className="flex gap-2">
              <span className="font-medium">Fecha:</span>
              <span className="flex gap-2 text-gray-700">
                <span>
                  {formatDateHours(
                    financialEconomicCycleReporte?.economicCycle?.openAt!
                  )}
                </span>
                <span className="font-medium">-</span>
                <span>
                  {formatDateHours(
                    financialEconomicCycleReporte?.economicCycle?.closedAt!
                  )}
                </span>
              </span>
            </div>

            <div className="flex gap-2">
              <span className="font-medium">Total vendido:</span>
              <div>
                <div className="space-x-1">
                  <span className="text-gray-700">
                    {financialEconomicCycleReporte?.economicCycle?.totalSalesInMainCurrency.amount.toFixed(
                      2
                    )}
                  </span>
                  <span className="text-gray-700">
                    {
                      financialEconomicCycleReporte?.economicCycle
                        ?.totalSalesInMainCurrency?.codeCurrency
                    }
                  </span>
                </div>

                {mainCurrency !== costCurrency && existExchangeRates && (
                  <>
                    {
                      <div className="space-x-1">
                        <span className="text-gray-700">
                          {getCostCurrency()}
                        </span>
                        <span className="text-gray-700">{costCurrency}</span>
                      </div>
                    }
                  </>
                )}
              </div>
            </div>

            {(existTotalIncomesInCash || existTotalIncomesNotInCash) && (
              <tr className="border-b border-gray-200 w-full">
                <td className="">
                  <div className="font-medium text-gray-900 text-base">Total de Ingresos:</div>
                  <div className="flex flex-col w-full">
                    {totalIncomes.map(element => {
                      if (element.transfer > 0 || element.cash > 0) {
                        return (
                          <div className="flex w-full items-start justify-between my-5">
                            <p className="font-medium text-gray-900 ">{element.codeCurrency}</p>
                            <div className="flex flex-col items-start justify-end ml-16">
                              {element.transfer > 0 && (
                                <p className="text-gray-700">Transferencia</p>
                              )}
                              {element.cash > 0 && (
                                <p className="text-gray-700">Efectivo</p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </td>
                <td className="">
                  <br />
                  <div className="flex flex-col w-full ml-16">
                    {totalIncomes.map(element => (
                      <div className="flex flex-col items-start justify-end my-5">
                        {element.transfer > 0 && (
                          <p className="text-center text-gray-700 whitespace-pre-wrap">{formatCurrencyWithOutCurrency(element.transfer)}</p>
                        )}
                        {element.cash > 0 && (
                          <p className="text-center text-gray-700 whitespace-pre-wrap">{formatCurrencyWithOutCurrency(element.cash)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}
 
            {mainCurrency !== costCurrency && existExchangeRates && (
              <div className="flex flex-col gap-1">
                <span className="text-base font-medium mt-4">
                  Tasa de cambio del día:
                </span>
                <div className="w-full overflow-x-auto text-base">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="py-2 px-2">Moneda</th>
                        <th className="py-2 px-2">
                          {mainCurrency ?? "Principal"}
                        </th>
                        <th className="py-2 px-2">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialEconomicCycleReporte?.exchange_rates
                        ?.filter((rate) => rate.code !== mainCurrency)
                        .map((rate, index) => (
                          <tr className="bg-gray-100 border-b" key={rate.code}>
                            <td className="py-2 px-2 text-gray-700">
                              {rate.code}
                            </td>
                            <td className="py-2 px-2 text-gray-700">
                              {rate.exchangeRate}
                            </td>
                            <td className="py-2 px-2 text-gray-700">
                              {(
                                rate.exchangeRate /
                                (financialEconomicCycleReporte?.exchange_rates?.find(
                                  (r) => r.code === costCurrency
                                )?.exchangeRate ?? 1)
                              ).toFixed(2) === "1.00"
                                ? "-"
                                : (
                                    rate.exchangeRate /
                                    (financialEconomicCycleReporte?.exchange_rates?.find(
                                      (r) => r.code === costCurrency
                                    )?.exchangeRate ?? 1)
                                  ).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {
              // @ts-ignore
              financialEconomicCycleReporte?.orders?.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-base font-medium mt-4">Facturas:</span>
                  <div className="w-full overflow-x-auto rounded-md">
                    <table className="min-w-full bg-white text-sm  text-gray-800">
                      <thead className="text-gray-800 bg-gray-200">
                        <tr>
                          <th className="py-2 px-2 text-center">No</th>
                          <th className="py-2 px-2 text-center">
                            Tipo de cliente
                          </th>
                          <th className="py-2 px-2 text-center">Cliente</th>
                          <th className="py-2 px-2 text-center">Comercial</th>
                          <th className="py-2 px-2 text-center">
                            Total de productos
                          </th>
                          <th className="py-2 px-2 text-center">
                            Comprobante de caja
                          </th>
                          <th className="py-2 px-2 text-center">
                            Total pagado
                          </th>
                          <th className="py-2 px-2 text-center">
                            Monto devuelto
                          </th>
                          <th className="py-2 px-2 text-center">
                            Observaciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialEconomicCycleReporte?.orders?.map(
                          (order: any, index: any) => (
                            <tr key={index} className="bg-gray-100 border-b">
                              <td className="py-2 px-2 text-gray-700 text-center">
                                {order?.operationNumber}
                              </td>
                              <td className="py-2 px-2 text-gray-700 text-center">
                                {order?.client?.customerCategory?.name
                                  ? order?.client?.customerCategory?.name
                                  : "-"}
                              </td>
                              <td className="py-2 px-2 text-gray-700 text-center">
                                {order?.client
                                  ? `${order?.client?.firstName} ${
                                      order?.client?.lastName ?? ""
                                    }`
                                  : "-"}
                              </td>
                              <td className="py-2 px-2 text-gray-700 text-center">
                                {order?.managedBy?.displayName}
                              </td>
                              <td className="py-2 px-2 text-gray-700 text-center">
                                {order?.selledProducts.reduce(
                                  (acc: any, product: any) =>
                                    acc + product.quantity,
                                  0
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-700 text-center">
                                {order?.cashRegisterOperations.length > 0
                                  ? order?.cashRegisterOperations.map(
                                      (item: any) => (
                                        <div key={item.codeCurrency}>
                                          {item?.operationNumber ?? "-"}
                                        </div>
                                      )
                                    )
                                  : "-"}
                              </td>
                              <td className="py-2 px-2 text-gray-700 text-center">
                                {order?.currenciesPayment.length > 0
                                  ? order?.currenciesPayment
                                      .map((payment: any) => (
                                        <div className="flex gap-2 items-center" key={payment.codeCurrency}>
                                          {formatCurrency(payment.amount,payment.codeCurrency)}
                                          {payment.paymentWay === "CASH" && (
                                            <BsCashCoin className="text-lg text-gray-500" />
                                          )}
                                          {payment.paymentWay === "TRANSFER" && (
                                            <BsCreditCard className="text-lg text-gray-500" />
                                          )}
                                        </div>
                                      ))
                                      .reduce(
                                        (acc: any, item: any) =>
                                          acc === "" ? [item] : [...acc, item],
                                        []
                                      )
                                  : "-"}
                              </td>
                              <td className="py-2 px-2 text-gray-700 text-center">
                                {order?.amountReturned
                                  ? ` ${formatCurrency(order?.amountReturned.amount,order?.amountReturned?.codeCurrency)}`
                                  : "-"}
                              </td>
                              <td className="py-2 px-2 text-gray-700">
                                {order?.observations
                                  ? order?.observations
                                  : "-"}
                              </td>
                            </tr>
                          )
                        )}
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">
                          Total
                        </td>
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">

                        </td>
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">

                        </td>
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">

                        </td>
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">
                          {financialEconomicCycleReporte?.orders?.reduce((acc: any, order: any) => acc + order?.selledProducts.reduce((accP: any, product: any) => accP + product?.quantity, 0), 0)}
                        </td>
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">

                        </td>
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">
                          {Object.entries(financialEconomicCycleReporte?.orders?.reduce((acc: any, order: any) => {
                            order?.currenciesPayment?.forEach((payment: any) => {
                              const key = `${payment?.codeCurrency}_${payment?.paymentWay}`;
                              if (acc[key]) {
                                acc[key] += payment?.amount;
                              } else {
                                acc[key] = payment?.amount;
                              }
                            });
                            return acc;
                          }, {})).map(([key, amount]) => (
                            <div key={key} className="flex gap-2 items-center justify-center">
                              <div>{formatCurrency(amount, key.split('_')[0])}</div>
                              <div>
                                {key.split('_')[1] === "CASH" && <BsCashCoin className="text-lg text-gray-500" />}
                                {key.split('_')[1] === "TRANSFER" && <BsCreditCard className="text-lg text-gray-500" />}
                              </div>
                            </div>
                          ))}
                        </td>
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">
                          {Object.entries(financialEconomicCycleReporte?.orders?.reduce((acc: any, order: any) => {
                            if (order?.amountReturned) {
                              const key = order?.amountReturned?.codeCurrency;
                              if (acc[key]) {
                                acc[key] += order?.amountReturned?.amount || 0;
                              } else {
                                acc[key] = order?.amountReturned?.amount || 0;
                              }
                            }
                            return acc;
                          }, {})).map(([key, amount]) => (
                            <div key={key}>{formatCurrency(amount, key)}</div>
                          ))}
                        </td>
                        <td className="py-2 px-2 text-gray-700 text-center bg-gray-100">

                        </td>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }

            {
              // @ts-ignore
              financialEconomicCycleReporte?.cashOperations?.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-base font-medium mt-4">
                    {" "}
                    Operaciones de caja:
                  </span>
                  <div className="w-full overflow-x-auto rounded-md">
                    <table className="min-w-full bg-white text-sm  text-gray-800">
                      <thead className="text-gray-800 bg-gray-200  ">
                        <tr>
                          <th className="py-2 px-2 text-center">No</th>
                          <th className="py-2 px-2 text-center">Hecho por</th>
                          <th className="py-2 px-2 text-center">Operación</th>
                          <th className="py-2 px-2 text-center">Monto</th>
                          <th className="py-2 px-2 text-center">Fecha</th>
                          <th className="py-2 px-2 text-center">
                            Observaciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialEconomicCycleReporte?.cashOperations?.map(
                          (operation: any, index: any) => (
                            <tr key={index} className="bg-gray-100 border-b">
                              <td className="py-3 px-2 text-gray-700 text-center">
                                {operation?.operationNumber ?? "-"}
                              </td>
                              <td className="py-3 px-2 text-gray-700 text-center">
                                {operation?.madeBy.displayName}
                              </td>
                              <td
                                className={`py-3 px-2 text-gray-700 text-center`}
                              >
                                <span
                                  className={`rounded-full py-1 px-3 ${getColorCashOperation(
                                    operation?.operation
                                  )}`}
                                >
                                  {getCashOperationSpanish(operation.operation)}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-gray-700 text-center">
                                {formatCurrency(operation?.amount, operation?.codeCurrency)}
                              </td>
                              <td className="py-3 px-2 text-gray-700 text-center">
                               {moment(operation.createdAt).format("hh:mm A")}
                              </td>
                              <td className="py-3 px-2 text-gray-700 ">
                                {operation?.observations
                                  ? operation.observations
                                  : "-"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </div>
        </Modal>
      )}
        </>
  )
}

export default FinancialEconomicCycleReporteModal