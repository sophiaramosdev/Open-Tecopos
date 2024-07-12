/* eslint-disable jsx-a11y/no-redundant-roles */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { AreaSalesIncomes, CashOpperationInterface, PriceInvoiceInterface } from "../../../../interfaces/ServerInterfaces";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import EmptyList from "../../../../components/misc/EmptyList";
import { formatCurrency, formatCurrencyWithOutCurrency } from "../../../../utils/helpers";
import { printPrice } from "../../../../utils/functions";
import { useAppSelector } from "../../../../store/hooks";
import { EconomicCycle } from "../../../../interfaces/Interfaces";



const CashRegisterReport = ({ areaSalesIncome, isLoading, ecoCycle }: { areaSalesIncome: AreaSalesIncomes[], isLoading: boolean, ecoCycle: EconomicCycle | null }) => {
  const { business } = useAppSelector((state) => state.init);
  const { areas } = useAppSelector((state) => state.nomenclator);

  //Operaciones con propinas
  const cash_operations_include_tips =
    business?.configurationsKey.find(
      (item) => item.key === "cash_operations_include_tips"
    )?.value === "true";

  //Operaciones con domicilio
  const cash_operations_include_deliveries =
    business?.configurationsKey.find(
      (item) => item.key === "cash_operations_include_deliveries"
    )?.value === "true";

  //Entregas habilitadas
  const enable_delivery =
    business?.configurationsKey.find((item) => item.key === "enable_delivery")
      ?.value === "true";

  //Extracción de salario del efectivo
  const extract_salary_from_cash =
    business?.configurationsKey.find(
      (item) => item.key === "extract_salary_from_cash"
    )?.value === "true";

  const slideLeft = () => {
    var slider = document.getElementById("slider");
    if (slider) slider.scrollLeft = slider.scrollLeft - 500;
  };

  const slideRight = () => {
    var slider = document.getElementById("slider");
    if (slider) slider.scrollLeft = slider.scrollLeft + 500;
  };

  //Reporte general -----------------------------------------------------------------------
  const getTotalPriceInvoices = (data: PriceInvoiceInterface[][]) => {
    const totals: PriceInvoiceInterface[] = [];
    data?.forEach((element) => {
      element.map((item) => {
        const index = totals.findIndex(
          (mount) => mount.codeCurrency === item.codeCurrency
        );
        if (index !== -1) {
          totals.splice(index, 1, {
            ...totals[index],
            amount: totals[index].amount + item.amount,
          });
        } else {
          totals.push(item);
        }
      });
    });
    return totals;
  };

  const getTotalCashOpperation = (data: CashOpperationInterface[][]) => {
    const totals: CashOpperationInterface[] = [];
    data.forEach((element) => {
      element.map((item) => {
        const index = totals.findIndex(
          (mount) =>
            mount.codeCurrency === item.codeCurrency &&
            mount.operation === item.operation
        );
        if (index !== -1) {
          totals.splice(index, 1, {
            ...totals[index],
            amount: totals[index].amount + item.amount,
          });
        } else {
          totals.push(item);
        }
      });
    });
    return totals;
  };

  const getTotalOrderModifiers = (data: any) => {
    const totals: any = [];
    data?.forEach((element:any) => {
      element?.map((item:any) => {
        const index = totals.findIndex(
          (modifier:any) => modifier.modifierName === item.modifierName
        );
        if (index !== -1) {
          item.prices.forEach((price:any) => {
            const priceIndex = totals[index].prices.findIndex(
              (totalPrice:any) => totalPrice.codeCurrency === price.codeCurrency
            );
            if (priceIndex !== -1) {
              totals[index].prices.splice(priceIndex, 1, {
                ...totals[index].prices[priceIndex],
                amount: totals[index].prices[priceIndex].amount + price.amount,
              });
            } else {
              totals[index].prices.push(price);
            }
          });
        } else {
          totals.push(item);
        }
      });
    });
    return totals;
  };

  const reports = [...areaSalesIncome];

  if (areaSalesIncome.length > 1) {
    const generalReport = {
      totalHouseCosted: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalHouseCosted)
      ),
      totalSales: getTotalPriceInvoices(reports.map((elem) => elem.totalSales)),
      totalOrderModifiers: getTotalOrderModifiers(
        areaSalesIncome.map((elem) => elem.totalOrderModifiers)
      ),
      totalIncomes: getTotalPriceInvoices(reports.map((elem) => elem.totalIncomes)),
      // taxes: getTotalPriceInvoices(areaSalesIncome.map((elem) => elem.taxes)),
      totalTips: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalTips)
      ),
      totalCashOperations: getTotalCashOpperation(
        areaSalesIncome.map((elem) => elem.totalCashOperations)
      ),
      totalDiscounts: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalDiscounts)
      ),
      totalShipping: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalShipping)
      ),
      totalInCash: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalInCash)
      ),
      totalInCashAfterOperations: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalInCashAfterOperations)
      ),
      totalIncomesNotInCash: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalIncomesNotInCash)
      ),
      totalIncomesInCash: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalIncomesInCash)
      ),
      totalCommissions: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalCommissions)
      ),
      totalTipsMainCurrency: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalTipsMainCurrency.amount,
          0
        ),
        codeCurrency: business?.costCurrency ?? "CUP",
      },
      totalSalesInMainCurrency: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalSalesInMainCurrency.amount,
          0
        ),
        codeCurrency: business?.costCurrency ?? "CUP",
      },
      totalSalary: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalSalary.amount,
          0
        ),
        codeCurrency: business?.costCurrency ?? "CUP",
      },
      totalCost: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalCost.amount,
          0
        ),
        codeCurrency: business?.costCurrency ?? "CUP",
      },
      totalGrossRevenue: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalGrossRevenue.amount,
          0
        ),
        codeCurrency: business?.costCurrency ?? "CUP",
      },
      totalAsumedCost: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item?.totalAsumedCost?.amount!,
          0
        ),
        codeCurrency: business?.costCurrency ?? "CUP",
      },
    };

    reports.unshift(generalReport);
  }
  //---------------------------------------------------------------------------------------

  // //@ts-ignore
  // const Exchange_rates: { exchange_rates: ExchangeRatesInterface[] } = ecoCycle?.meta !== null ? JSON.parse(ecoCycle?.meta! as string).exchange_rates : { exchange_rates: [] }
  // // const Exchange_rates: { exchange_rates: ExchangeRatesInterface[] } = ecoCycle?.meta !== null ? findExchangeRateObject(JSON.parse(ecoCycle?.meta! as string)) : { exchange_rates: [] }

  //@ts-ignore
  const Exchange_rates: { exchange_rates: ExchangeRatesInterface[] } = (ecoCycle !== null && ecoCycle?.meta !== null) ? JSON.parse(ecoCycle?.meta! as string).exchange_rates : { exchange_rates: [] }

  return isLoading ? (
    <SpinnerLoading text="Cargando datos, por favor espere ..." />
  ) : areaSalesIncome.length === 0 ? (
    <EmptyList
      title="Sin datos que mostrar"
      subTitle="No se han realizado operaciones en este ciclo económico"
    />
  ) : (
    <>

      {
        Exchange_rates?.exchange_rates?.length > 0 && (
          < div className="flex items-center justify-start p-2">
            <p className="font-semibold text-black ml-12 whitespace-nowrap mr-2">Tasas de cambio: </p>

            {
              Exchange_rates?.exchange_rates?.length > 4
                ? (<div className="relative flex items-center justify-start overflow-x-hidden">
                  <ul
                    role="list"
                    className="overflow-x-hidden animate-marquee whitespace-nowrap mx-auto flex justify-center lg:mx-0 lg:justify-start "
                  >
                    {
                      Exchange_rates?.exchange_rates?.map(elem => {

                        if (business?.mainCurrency !== elem.code) {
                          return (
                            <p className=" text-black mx-2"> 1 {elem.code} = {elem.exchangeRate} {business?.mainCurrency} </p>
                          )
                        }
                      })
                    }
                  </ul>
                  <ul
                    role="list"
                    className="absolute top-0 overflow-x-hidden animate-marquee2 whitespace-nowrap mx-auto flex justify-center  lg:mx-0 lg:justify-start "
                  >
                    {
                      Exchange_rates?.exchange_rates?.map(elem => {

                        if (business?.mainCurrency !== elem.code) {
                          return (
                            <p className=" text-black mx-2"> 1 {elem.code} = {elem.exchangeRate} {business?.mainCurrency} </p>
                          )
                        }

                      })
                    }
                  </ul>
                </div>)
                : (
                  <div className="flex items-center justify-start p-2">
                    {
                      Exchange_rates?.exchange_rates?.map(elem => {

                        if (business?.mainCurrency !== elem.code) {
                          return (
                            <p className=" text-black mx-2"> 1 {elem.code} = {elem.exchangeRate} {business?.mainCurrency} </p>
                          )
                        }
                      })
                    }</div>
                )
            }
          </div>
        )}
      <div className="inline-flex justify-end w-full">
      </div>

      <div className="mb-16 w-full px-5">
        <div className="mx-auto w-full">
          { }
          <div className="relative flex items-center">
            <FontAwesomeIcon
              icon={faChevronLeft}
              className="opacity-50 cursor-pointer hover:opacity-100"
              onClick={slideLeft}
              size={"2x"}
            />
            <div
              id="slider"
              className="w-full h-full whitespace-nowrap scroll-smooth scrollbar-thin overflow-x-scroll"
            >
              {reports.map((item, idx) => {

                const totalIncomes: Array<{ codeCurrency: string, transfer: number, cash: number }> = []

                // Crear un conjunto (set) de todos los codeCurrency presentes en ambos arreglos
                const allCurrencies = new Set([...item.totalIncomesNotInCash.map(item => item.codeCurrency), ...item.totalIncomesInCash.map(item => item.codeCurrency)]);
                // Iterar sobre todos los códigos de moneda
                allCurrencies.forEach(currency => {
                  const transferData = item.totalIncomesNotInCash.find(item => item.codeCurrency === currency);
                  const cashData = item.totalIncomesInCash.find(item => item.codeCurrency === currency);

                  const transferAmount = transferData ? transferData.amount : 0;
                  const cashAmount = cashData ? cashData.amount : 0;

                  totalIncomes.push({
                    codeCurrency: currency,
                    transfer: transferAmount,
                    cash: cashAmount
                  });
                });

                

                return (
                  <div
                    key={idx}
                    className={`divide-gray-300 bg-white m-6 rounded-lg border px-10 max-w-lg border-gray-300 shadow-md inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300`}
                  >
                    <div className="-mx-4 mt-8 flex flex-col sm:-mx-6 md:mx-2">
                      <h5 className="text-lg font-medium text-gray-900">
                         {areas.find((area) => area.id === item.areaId)?.name ??
                          "Resumen General"}
                      </h5>
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead>
                          <tr>
                            <th
                              scope="col"
                              className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
                            ></th>

                            <th
                              scope="col"
                              className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0"
                            >
                              Monto
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/**Total en ventas */}
                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                Total ventas
                              </div>
                            </td>

                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalSales.length !== 0
                                ? item.totalSales
                                  .map((item) =>
                                    formatCurrency(
                                      item.amount,
                                      item.codeCurrency
                                    )
                                  )
                                  .join(`\n`)
                                : printPrice(0)}
                            </td>
                          </tr>

                         {/* Modificadores de las ordernes */}
                         {item?.totalOrderModifiers &&
                            item?.totalOrderModifiers.map(
                              (modifier: any, index: any) => (
                                <tr className="border-b border-gray-200 w-full">
                                  <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0 w-full font-medium text-gray-900">
                                    <span>{modifier.modifierName}</span>
                                  </td>
                                  <td className="py-4 pr-0 pl-4 text-sm sm:pl-6 md:pl-0 w-full">
                                    {modifier?.prices?.map((price: any) => {
                                      return (
                                        <div className="flex gap-1 justify-end text-gray-500">
                                          <span>{price?.amount}</span>
                                          <span>{price?.codeCurrency}</span>
                                        </div>
                                      );
                                    })}
                                  </td>
                                </tr>
                              )
                            )} 

                          {/**Total de Ingresos */}
                          <tr className="border-b border-gray-200 w-full">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                Total de Ingresos
                              </div>

                              {/* Nueva forma */}
                              <div className="flex flex-col w-full">
                                {
                                  totalIncomes.map(element => {
                                    if (element.transfer > 0 || element.cash > 0) {
                                      return (
                                        <div className="flex w-full items-start justify-between my-5">
                                          <p className="font-medium text-gray-900 w-1/3">{element.codeCurrency}</p>
                                          <div className="flex flex-col items-center justify-end w-2/3">
                                            {element.transfer > 0 && (
                                              <p className="my-1 text-gray-500">Transferencia</p>
                                            )}
                                            {
                                              element.cash > 0 && (
                                                <p className="my-1 text-gray-500">Efectivo</p>
                                              )
                                            }
                                          </div>
                                        </div>
                                      )
                                    }

                                  })
                                }
                              </div>

                            </td>
                            {totalIncomes.length === 0 && <td className="py-4 pl-4 text-sm sm:pl-6 md:pl-0 text-gray-500 text-right">0.00</td>}
                            <td className="py-4 pl-4 text-sm sm:pl-6 md:pl-0">
                              <br />
                              <div className="flex flex-col w-full">
                                {
                                  totalIncomes.map(element => (
                                    <div className="flex flex-col items-end justify-end my-5">
                                      {
                                        element.transfer > 0 && (
                                          <p className=" text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">{formatCurrencyWithOutCurrency(element.transfer)}</p>
                                        )
                                      }

                                      {
                                        element.cash > 0 && (
                                          <p className=" text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">{formatCurrencyWithOutCurrency(element.cash)}</p>
                                        )
                                      }
                                    </div>
                                  ))
                                }
                              </div>
                            </td>


                          </tr>


                          {/**Fondo */}
                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                Fondo
                              </div>
                            </td>

                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalCashOperations.filter(
                                (item) => item.operation === "MANUAL_FUND"
                              ).length !== 0
                                ? item.totalCashOperations
                                  .filter(
                                    (item) => item.operation === "MANUAL_FUND"
                                  )
                                  .map((item) =>
                                    formatCurrency(
                                      item.amount,
                                      item.codeCurrency
                                    )
                                  )
                                  .join(`\n`)
                                : printPrice(0)}
                            </td>
                          </tr>

                          {/**Extracciones */}
                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                Extracciones
                              </div>
                            </td>

                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalCashOperations.filter(
                                (item) => item.operation === "MANUAL_WITHDRAW"
                              ).length !== 0
                                ? item.totalCashOperations
                                  .filter(
                                    (item) =>
                                      item.operation === "MANUAL_WITHDRAW"
                                  )
                                  .map((item) =>
                                    formatCurrency(
                                      item.amount,
                                      item.codeCurrency
                                    )
                                  )
                                  .join(`\n`)
                                : printPrice(0)}
                            </td>
                          </tr>

                          {/**Depositos */}
                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                Depósitos
                              </div>
                            </td>

                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalCashOperations.filter(
                                (item) => item.operation === "MANUAL_DEPOSIT"
                              ).length !== 0
                                ? item.totalCashOperations
                                  .filter(
                                    (item) =>
                                      item.operation === "MANUAL_DEPOSIT"
                                  )
                                  .map((item) =>
                                    formatCurrency(
                                      item.amount,
                                      item.codeCurrency
                                    )
                                  )
                                  .join(`\n`)
                                : printPrice(0)}
                            </td>
                          </tr>

                          {/**Envios incluido en caja */}
                          {cash_operations_include_deliveries &&
                            enable_delivery && (
                              <tr className="border-b border-gray-200 w-full">
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                  <div className="font-medium text-gray-900">
                                    Envíos
                                  </div>

                                  <div className="flex flex-col w-full">
                                    {item.totalShipping.length > 0
                                      && item.totalShipping
                                        .map((item) => (
                                          <div className="flex w-full items-start justify-between my-5">
                                            <p className="font-medium text-gray-900 w-1/3">{item.codeCurrency}</p>

                                            <div className="flex flex-col items-center justify-end w-2/3">
                                              {(item.paymentWay === "TRANSFER" && item.amount > 0) && (
                                                <p className="my-1 text-gray-500">Transferencia</p>
                                              )}
                                              {((item.paymentWay === "CASH" || item.paymentWay === null) && item.amount > 0) && (
                                                <p className="my-1 text-gray-500">Efectivo</p>
                                              )}
                                            </div>

                                          </div>
                                        )
                                        )
                                    }
                                  </div>

                                </td>

                                <td className="py-4 pl-4   text-sm sm:pl-6 md:pl-0">
                                  {
                                    item.totalShipping.length > 0
                                      ? (
                                        <div className="flex flex-col w-full">
                                          <br />
                                          {item.totalShipping.length > 0
                                            && item.totalShipping
                                              .map((item) => (
                                                <div className="flex w-full items-end justify-end my-5">
                                                  <div className="flex flex-col items-end justify-end w-2/3">
                                                    {(item.paymentWay === "TRANSFER" && item.amount > 0) && (
                                                      <p className="text-right my-1 text-gray-500">{formatCurrencyWithOutCurrency(item.amount)}</p>
                                                    )}
                                                    {((item.paymentWay === "CASH" || item.paymentWay === null) && item.amount > 0) && (
                                                      <p className="text-right my-1 text-gray-500">{formatCurrencyWithOutCurrency(item.amount)}</p>
                                                    )}
                                                  </div>

                                                </div>
                                              )
                                              )
                                          }
                                        </div>
                                      )
                                      : (
                                        <p className="text-right text-gray-500">{printPrice(0)}</p>
                                      )
                                  }
                                </td>

                              </tr>
                            )}

                          {/**Propinas incluida en caja */}
                          {cash_operations_include_tips && (
                            <>
                              {/* Propinas por monedas */}
                              {item.totalTips.length > 0 && (
                                <tr className="border-b border-gray-200">
                                  <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                    <div className="font-medium text-gray-900">
                                      Propinas
                                    </div>

                                    <div className="flex flex-col w-full">
                                      {item.totalTips
                                        .map((item) => (
                                          <div className="flex w-full items-start justify-between my-5">
                                            <p className="font-medium text-gray-900 w-1/3">{item.codeCurrency}</p>

                                            <div className="flex flex-col items-center justify-end w-2/3">
                                              {(item.paymentWay === "TRANSFER" && item.amount > 0) && (
                                                <p className="my-1 text-gray-500">Transferencia</p>
                                              )}
                                              {((item.paymentWay === "CASH" || item.paymentWay === null) && item.amount > 0) && (
                                                <p className="my-1 text-gray-500">Efectivo</p>
                                              )}
                                            </div>

                                          </div>
                                        )
                                        )
                                      }
                                    </div>

                                  </td>

                                  <td className="py-4 pl-4 text-sm sm:pl-6 md:pl-0">
                                    <br />
                                    <div className="flex flex-col w-full">
                                      {item.totalTips
                                        .map((item) => (
                                          <div className="flex w-full items-end my-5">
                                            <div className="flex flex-col items-center justify-end w-2/3">
                                              {(item.paymentWay === "TRANSFER" && item.amount > 0) && (
                                                <p className="my-1 text-gray-500">{formatCurrencyWithOutCurrency(item.amount)}</p>
                                              )}
                                              {((item.paymentWay === "CASH" || item.paymentWay === null) && item.amount > 0) && (
                                                <p className="my-1 text-gray-500">{formatCurrencyWithOutCurrency(item.amount)}</p>
                                              )}
                                            </div>

                                          </div>
                                        )
                                        )
                                      }
                                    </div>
                                  </td>
                                </tr>
                              )}

                              {/* Total en propinas */}
                              <tr className="border-b border-gray-200">
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                  <div className="font-medium text-gray-900">
                                    Total de propinas en moneda principal
                                  </div>
                                </td>

                                <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">
                                  {formatCurrency(
                                    item.totalTipsMainCurrency.amount,
                                    business.mainCurrency ??
                                    "CUP"
                                  )}
                                </td>
                              </tr>
                            </>
                          )}

                          {/**Otras formas de pago */}
                          {/* <tr className="border-b border-green-700">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                Otras formas de pago
                              </div>
                            </td>
  
                            <td className="flex flex-col py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalIncomesNotInCash.length !== 0
                                ? item.totalIncomesNotInCash.map(
                                  (income, idx) => (
                                    <span
                                      className="inline-flex gap-1"
                                      key={idx}
                                    >
                                      {formatCurrency(
                                        income.amount,
                                        income.codeCurrency
                                      )}
                                      <CreditCardIcon className="h-5" />
                                    </span>
                                  )
                                )
                                : printPrice(0)}
                            </td>
                          </tr> */}

                          {/**Efectivo en caja */}
                          <tr className="border-b border-t  bg-emerald-200 border-emerald-700 mt-5">
                            <td className="py-4 text-sm">
                              <div className="font-bold text-gray-900 pl-2">
                                Efectivo en caja
                              </div>
                            </td>

                            <td className="py-4 pr-2 text-right text-sm text-red-700 whitespace-pre-wrap ">
                              {item.totalInCash.length !== 0
                                ? item.totalInCash
                                  .map((item) =>
                                    formatCurrency(
                                      item.amount,
                                      item.codeCurrency
                                    )
                                  )
                                  .join(`\n`)
                                : printPrice(0)}
                            </td>
                          </tr>

                          {/**Salario */}
                          {extract_salary_from_cash && (
                            <>
                              <tr className="border-b border-teal-700">
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                  <div className="font-medium text-gray-900">
                                    Salario
                                  </div>
                                </td>

                                <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                                  {formatCurrency(
                                    item.totalSalary.amount,
                                    item.totalSalary.codeCurrency
                                  )}
                                </td>
                              </tr>
                              <tr className="border-b border-t  bg-teal-200 border-teal-700 mt-5">
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                  <div className="font-bold p-2 text-gray-900">
                                    A despachar
                                  </div>
                                </td>

                                <td className="py-4 pr-2 text-right text-sm text-red-700 whitespace-pre-wrap">
                                  {item.totalInCashAfterOperations
                                    .map((item) =>
                                      formatCurrency(
                                        item.amount,
                                        item.codeCurrency
                                      )
                                    )
                                    .join(`\n`)}
                                </td>
                              </tr>
                            </>
                          )}

                          {/**Propinas no incluidas en caja */}
                          {!cash_operations_include_tips &&
                            item.totalTips.length !== 0 && (
                              <tr className="border-b border-gray-200">
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                  <div className="font-medium text-gray-900">
                                    Propinas
                                  </div>
                                </td>

                                <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                                  {item.totalTips
                                    .map((item) =>
                                      formatCurrency(
                                        item.amount,
                                        item.codeCurrency
                                      )
                                    )
                                    .join(`\n`)}
                                </td>
                              </tr>
                            )}

                          {/**Propina en moneda principal no incluida en caja */}
                          {!cash_operations_include_tips && (
                            <>
                              <tr className="border-b border-gray-200">
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                  <div className="font-medium text-gray-900">
                                    Propinas en moneda principal
                                  </div>
                                </td>

                                <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">
                                  {formatCurrency(
                                    item.totalTipsMainCurrency.amount,
                                    business?.mainCurrency ??
                                    "CUP"
                                  )}
                                </td>
                              </tr>

                              {item.totalTips.length > 1 && (
                                <tr className="border-b border-gray-200">
                                  <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                    <div className="font-medium text-gray-900">
                                      Propinas por monedas
                                    </div>
                                  </td>

                                  <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                                    {item.totalTips
                                      .map((item) =>
                                        formatCurrency(
                                          item.amount,
                                          item.codeCurrency
                                        )
                                      )
                                      .join(`\n`)}
                                  </td>
                                </tr>
                              )}
                            </>
                          )}

                          {/**Envios no incluido en caja */}
                          {!cash_operations_include_deliveries &&
                            enable_delivery && (
                              <tr className="border-b border-gray-200 w-full">
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                                  <div className="font-medium text-gray-900">
                                    Envíos
                                  </div>

                                  <div className="flex flex-col w-full">
                                    {item.totalShipping.length > 0
                                      && item.totalShipping
                                        .map((item) => (
                                          <div className="flex w-full items-start justify-between my-5">
                                            <p className="font-medium text-gray-900 w-1/3">{item.codeCurrency}</p>

                                            <div className="flex flex-col items-center justify-end w-2/3">
                                              {(item.paymentWay === "TRANSFER" && item.amount > 0) && (
                                                <p className="my-1 text-gray-500">Transferencia</p>
                                              )}
                                              {((item.paymentWay === "CASH" || item.paymentWay === null) && item.amount > 0) && (
                                                <p className="my-1 text-gray-500">Efectivo</p>
                                              )}
                                            </div>

                                          </div>
                                        )
                                        )
                                    }
                                  </div>

                                </td>

                                <td className="py-4 pl-4  text-sm sm:pl-6 md:pl-0">
                                  <br />
                                  {
                                    item.totalShipping.length > 0
                                      ? (
                                        <div className="flex flex-col w-full">
                                          {item.totalShipping.length > 0
                                            && item.totalShipping
                                              .map((item) => (
                                                <div className="flex w-full items-end justify-end my-5">
                                                  <div className="flex flex-col items-end justify-end w-2/3">
                                                    {(item.paymentWay === "TRANSFER" && item.amount > 0) && (
                                                      <p className="text-right my-1 text-gray-500">{formatCurrencyWithOutCurrency(item.amount)}</p>
                                                    )}
                                                    {((item.paymentWay === "CASH" || item.paymentWay === null) && item.amount > 0) && (
                                                      <p className="text-right my-1 text-gray-500">{formatCurrencyWithOutCurrency(item.amount)}</p>
                                                    )}
                                                  </div>

                                                </div>
                                              )
                                              )
                                          }
                                        </div>
                                      )
                                      : (
                                        <p className="text-right text-gray-500">{printPrice(0)}</p>
                                      )
                                  }
                                </td>

                              </tr>
                            )}

                         
                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                Comisiones
                              </div>
                            </td>

                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalCommissions.length !== 0
                                ? item.totalCommissions
                                  .map((item) =>
                                    formatCurrency(
                                      item.amount,
                                      item.codeCurrency
                                    )
                                  )
                                  .join(`\n`)
                                : printPrice(0)}
                            </td>
                          </tr>

                         
                          <div className="font-semibold text-base pt-4">Costos</div>
                          
                          {/**Consumo casa */}
                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-4">
                              <div className="font-medium text-gray-900">
                                Consumo casa
                              </div>
                            </td>

                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalHouseCosted.length !== 0
                                ? item.totalHouseCosted
                                  .map((item) =>
                                    formatCurrency(
                                      item.amount,
                                      item.codeCurrency
                                    )
                                  )
                                  .join(`\n`)
                                : printPrice(0)}
                            </td>
                          </tr>
                            {/**Descuentos */}
                            <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-4">
                              <div className="font-medium text-gray-900">
                                Descuentos
                              </div>
                            </td>

                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalDiscounts.length !== 0
                                ? item.totalDiscounts
                                  .map((item) =>
                                    formatCurrency(
                                      item.amount,
                                      item.codeCurrency
                                    )
                                  )
                                  .join(`\n`)
                                : printPrice(0)}
                            </td>
                          </tr>

                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-4">
                              <div className="font-medium text-gray-900">
                                Costo de las mercancías
                              </div>
                            </td>
                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalCost
                                ? formatCurrency(
                                  item.totalCost.amount,
                                  item.totalCost.codeCurrency
                                )
                                : printPrice(0)}
                            </td>
                          </tr>

                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-4">
                              <div className="font-medium text-gray-900">
                                Subtotal
                              </div>
                            </td>
                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                            {item.totalCost && item?.totalAsumedCost
                            ? formatCurrency(
                               (Number(item.totalCost.amount) + Number(item?.totalAsumedCost?.amount || 0)),
                               item.totalCost.codeCurrency
                             )
                             : printPrice(0)}
                            </td>
                          </tr>
                          
                          <tr className="border-b border-gray-200">
                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                Ganancia en ventas
                              </div>
                            </td>

                            <td className="py-4 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              {item.totalGrossRevenue
                                ? formatCurrency(
                                  item.totalGrossRevenue.amount,
                                  item.totalGrossRevenue.codeCurrency
                                )
                                : printPrice(0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
            <FontAwesomeIcon
              icon={faChevronRight}
              className="opacity-50 cursor-pointer hover:opacity-100"
              onClick={slideRight}
              size={"2x"}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default CashRegisterReport
