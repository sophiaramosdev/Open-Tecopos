import Breadcrumb from "../../components/navigation/Breadcrumb";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { SubmitHandler, useForm } from "react-hook-form";
import useServerReports from "../../api/useServerReports";
import DateInput from "../../components/forms/DateInput";
import MultiSelect from "../../components/forms/Multiselect";
import Button from "../../components/misc/Button";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import Toggle from "../../components/forms/Toggle";
import useServerBankAccount from "../../api/useServerBankAccount";
import { SelectInterface } from "../../interfaces/InterfacesLocal";
import GenericTable from "../../components/misc/GenericTable";
import {
  calculateAmountTotalOfDifferentCurrencies,
  formatCurrency,
} from "../../utils/helpers";
import { FaRegFilePdf } from "react-icons/fa";
import reportDownloadHandler from "../../reports/helpers/reportDownloadHandler";
import MultiCheckbox from "../../components/forms/MultiCheckbox";
import { groupBy } from "../../utils/helpers";
import { CurrenciesPaymentInterface } from "../../interfaces/ServerInterfaces";

const BalanceSheet = ({}) => {
  const { handleSubmit, control } = useForm();
  const { isFetching, financialReport, getFinancialReport } =
    useServerReports();
  const [includeBankOperations, setIncludeBankOperations] = useState(false);
  const { business, user } = useAppSelector((state) => state.init);
  const { allBankAccount, getAllBankAccountWithOutFilter } = useServerBankAccount();

  const module_accounts =
    business?.configurationsKey.find((itm) => itm.key === "module_accounts")
      ?.value === "true";
  const authorizedRoles = user?.roles.filter(itm=>["OWNER", "GROUP_OWNER", "MANAGER_CONTABILITY" ].includes(itm.code)).length !== 0;

  useEffect(() => {
    module_accounts && authorizedRoles && getAllBankAccountWithOutFilter();
  }, []);

  const selectDataAccount: SelectInterface[] = [];

  allBankAccount.map((item) => {
    selectDataAccount.push({
      id: item.id,
      name: item.name,
      disabled: false,
    });
  });

  const onSubmit: SubmitHandler<Record<string, number>> = (data) => {
    let newFilter = {
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      origin: data.origin,
    };

    if (data.includeBankOperations) {
      // @ts-ignore
      newFilter["accountIds" as keyof typeof newFilter] = data.accountIds;
    }
    // @ts-ignore
    getFinancialReport(newFilter);
  };

  const isModuleAccountsActive =
    business?.configurationsKey.some(
      (confKey) => confKey.key === "module_accounts" && confKey.value === "true"
    ) ?? false;

  const colorByAmount = (amount: number) => {
    switch (Math.sign(amount)) {
      case -1:
        return "red-600";
      case 1:
        return "green-600";
      default:
        return "gray-600";
    }
  };

  const getByOperation = (operations: Array<any>, operation: string) => {
    const filteredOperations = operations
      .filter((item) => item.operation === operation)
      .map(
        (item) =>
          (
            <span className={"text-" + colorByAmount(item.amount)}>
              {formatCurrency(item.amount, item.codeCurrency)}
            </span>
          ) || emptyValue()
      );

    if (filteredOperations.length) return filteredOperations;
    return emptyValue();
  };

  let debits: Array<{ amount: number; codeCurrency: string }> = [];
  let credits: Array<{ amount: number; codeCurrency: string }> = [];
  let totals: Array<{ amount: number; codeCurrency: string }> = [];

  const calculatePercent = (amount: number, codeCurrency: string) => {
    if (financialReport?.totalSalesInMainCurrency.amount) {
      const mainCurrencyAmount =
        financialReport.totalSalesInMainCurrency.codeCurrency === codeCurrency
          ? amount
          : amount *
              //@ts-ignore
              business?.availableCurrencies.find(
                (currency) => currency.code === codeCurrency
              )?.exchangeRate || 1;

      return (
        " (" +
        new Intl.NumberFormat("es-ES", {
          style: "percent",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(
          //@ts-ignore
          mainCurrencyAmount / financialReport.totalSalesInMainCurrency.amount
        ) +
        ")"
      ).replace("-", "");
    }
    return "";
  };

  const emptyValue = (withPercent = true) => {
    let amount = formatCurrency(0, business?.costCurrency || "CUP");
    amount += withPercent
      ? calculatePercent(0, business?.costCurrency || "CUP")
      : "";
    return <span className={"text-" + colorByAmount(0)}>{amount}</span>;
  };

  const groupByPaymentWay = (payments: Array<any>) =>
    groupBy(payments, "paymentWay");

  return (
    <div className="flex flex-col gap-2">
      <Breadcrumb
        icon={<ArrowTrendingUpIcon className="h-6 text-gray-500" />}
        paths={[{ name: "Análisis" }, { name: "Cierre contable" }]}
      />

      {/*Filter section*/}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
          <div className="h-50">
            <div className="md:grid md:grid-cols-2 md:gap-y-4 md:gap-x-8">
              <div className="py-2">
                <DateInput
                  name={"dateFrom"}
                  label={"Desde *"}
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                  untilToday
                  fromCustom="2023-10-01"
                />
              </div>
              <div className="py-2">
                <DateInput
                  name={"dateTo"}
                  label={"Hasta *"}
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                  untilToday
                />
              </div>
              <div className="py-1 w-1/3">
                <div className="block text-sm font-medium text-gray-700">
                  Origen *
                </div>
                <MultiCheckbox
                  name="origin"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                  displayCol={true}
                  data={[
                    {
                      value: "pos",
                      name: "pos",
                      label: "Puntos de Venta",
                    },
                    {
                      value: "online",
                      name: "online",
                      label: "Tienda Online",
                    },
                  ]}
                />
              </div>
              {isModuleAccountsActive && (
                <div className="w-full">
                  <div>
                    <Toggle
                      title="Incluir operaciones bancarias"
                      name="includeBankOperations"
                      changeState={setIncludeBankOperations}
                      control={control}
                    />
                  </div>

                  {includeBankOperations && (
                    <div className="py-1 pb-4">
                      <MultiSelect
                        name="accountIds"
                        rules={{ required: "Este campo es requerido" }}
                        data={selectDataAccount.map((item) => ({
                          id: item.id,
                          name: item.name,
                        }))}
                        label="Cuentas *"
                        control={control}
                        defaultValue={() => {}}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-50 text-right">
            <Button
              color="gray-600"
              type="submit"
              name="Buscar"
              loading={isFetching}
              disabled={isFetching}
            />
          </div>
        </div>
      </form>

      {/* Results */}
      {!isFetching && financialReport && (
        <div className="border border-slate-300 rounded p-2 overflow-y-visible">
          <div className="px-4 py-2 text-right">
            <Button
              color="white"
              name="Exportar"
              textColor="gray-500"
              icon={<FaRegFilePdf className="h-5 text-gray-500" />}
              action={() => {
                reportDownloadHandler("Finanzas", "finance", business!, {
                  ...financialReport,
                  includeBankOperations,
                });
              }}
              outline
            />
          </div>
          <div className="grid grid-cols-2 gap-8">
            {/* Ventas */}
            <div className="flex flex-col border p-4 gap-y-2">
              <div className="font-semibold">Ventas</div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="flex flex-col items-end">
                  {financialReport.totalSales?.length
                    ? financialReport.totalSales.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(finance.amount, finance.codeCurrency)}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total en moneda principal:</span>
                <span
                  className={
                    "text-" +
                    colorByAmount(
                      financialReport.totalSalesInMainCurrency.amount
                    )
                  }
                >
                  {formatCurrency(
                    financialReport.totalSalesInMainCurrency.amount,
                    financialReport.totalSalesInMainCurrency.codeCurrency
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Costo total:</span>
                <span
                  className={
                    "text-" + colorByAmount(financialReport.totalCost.amount)
                  }
                >
                  {formatCurrency(
                    financialReport.totalCost.amount,
                    financialReport.totalCost.codeCurrency
                  ) +
                    calculatePercent(
                      financialReport.totalCost.amount!,
                      financialReport.totalCost.codeCurrency!
                    )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ganancia:</span>
                <span
                  className={
                    "text-" +
                    colorByAmount(financialReport.generalRevenue.amount)
                  }
                >
                  {formatCurrency(
                    financialReport.totalSalesInMainCurrency.amount -
                      financialReport.totalCost.amount,
                    financialReport.totalSalesInMainCurrency.codeCurrency
                  ) +
                    calculatePercent(
                      financialReport.totalSalesInMainCurrency.amount -
                        financialReport.totalCost.amount,
                      financialReport.totalSalesInMainCurrency.codeCurrency!
                    )}
                </span>
              </div>
            </div>

            {/* Ingresos por ventas */}
            <div className="flex flex-col border p-4 gap-y-2">
              <div className="font-semibold">Ingresos por ventas</div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="flex flex-col items-end">
                  {financialReport.totalIncomes?.length
                    ? financialReport.totalIncomes.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount!)}
                        >
                          {formatCurrency(
                            finance.amount!,
                            finance.codeCurrency
                          )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total en moneda principal:</span>
                <span
                  className={
                    "text-" +
                    colorByAmount(
                      financialReport.totalIncomesInMainCurrency.amount!
                    )
                  }
                >
                  {formatCurrency(
                    financialReport.totalIncomesInMainCurrency.amount!,
                    financialReport.totalIncomesInMainCurrency.codeCurrency
                  ) +
                    calculatePercent(
                      financialReport.totalIncomesInMainCurrency.amount!,
                      financialReport.totalIncomesInMainCurrency.codeCurrency!
                    )}
                </span>
              </div>

              <div className="font-semibold">Por formas de pago</div>
              <div className="flex justify-between ml-4">
                <span>Efectivo:</span>
                <span className="flex flex-col items-end">
                  {financialReport.totalIncomesInCash?.length
                    ? financialReport.totalIncomesInCash.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(
                            finance.amount,
                            finance.codeCurrency
                          ) +
                            calculatePercent(
                              finance.amount!,
                              finance.codeCurrency!
                            )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between ml-4">
                <span>Transferencia:</span>
                <span className="flex flex-col items-end">
                  {groupByPaymentWay(financialReport.totalIncomesNotInCash)[
                    "TRANSFER"
                  ]
                    ? groupByPaymentWay(financialReport.totalIncomesNotInCash)[
                        "TRANSFER"
                      ].map((finance: CurrenciesPaymentInterface, key:number) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(
                            finance.amount,
                            finance.codeCurrency
                          ) +
                            calculatePercent(
                              finance.amount!,
                              finance.codeCurrency!
                            )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between ml-4">
                <span>Tarjeta de crédito/débito:</span>
                <span className="flex flex-col items-end">
                  {groupByPaymentWay(financialReport.totalIncomesNotInCash)[
                    "CARD"
                  ]
                    ? groupByPaymentWay(financialReport.totalIncomesNotInCash)[
                        "CARD"
                      ].map((finance: CurrenciesPaymentInterface, key:number) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(
                            finance.amount,
                            finance.codeCurrency
                          ) +
                            calculatePercent(
                              finance.amount!,
                              finance.codeCurrency!
                            )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
            </div>

            {/* Operaciones de caja */}
            {!includeBankOperations && (
              <div className="flex flex-col border p-4 gap-y-2">
                <div className="font-semibold">Operaciones de caja</div>
                <div className="flex justify-between">
                  <span>
                    Extracciones: *<br />{" "}
                    <span className="text-gray-500 text-xs">
                      (Las extracciones incluyen el monto por concepto de
                      salario)
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    {financialReport.totalCashOperations?.length
                      ? getByOperation(
                          financialReport.totalCashOperations,
                          "MANUAL_WITHDRAW"
                        )
                      : emptyValue()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Depósitos:</span>
                  <span className="flex flex-col items-end">
                    {financialReport.totalCashOperations?.length
                      ? getByOperation(
                          financialReport.totalCashOperations,
                          "MANUAL_DEPOSIT"
                        )
                      : emptyValue(false)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Salarios:</span>
                  <span
                    className={
                      "text-" +
                      colorByAmount(financialReport.totalSalary.amount)
                    }
                  >
                    {formatCurrency(
                      financialReport.totalSalary.amount,
                      financialReport.totalSalary.codeCurrency
                    ) +
                      calculatePercent(
                        financialReport.totalSalary.amount!,
                        financialReport.totalSalary.codeCurrency!
                      )}
                  </span>
                </div>
              </div>
            )}

            {/* Otros */}
            <div className="flex flex-col border p-4 gap-y-2">
              <div className="font-semibold">Otros</div>
              <div className="flex justify-between">
                <span>Propinas:</span>
                <span className="flex flex-col items-end">
                  {financialReport.totalTips?.length
                    ? financialReport.totalTips.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(
                            finance.amount,
                            finance.codeCurrency
                          ) +
                            calculatePercent(
                              finance.amount!,
                              finance.codeCurrency!
                            )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Envíos:</span>
                <span className="flex flex-col items-end">
                  {financialReport.totalShipping?.length
                    ? financialReport.totalShipping.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(finance.amount, finance.codeCurrency)}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Descuentos:</span>
                <span className="flex flex-col items-end">
                  {financialReport.totalDiscounts?.length
                    ? financialReport.totalDiscounts.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(
                            finance.amount,
                            finance.codeCurrency
                          ) +
                            calculatePercent(
                              finance.amount!,
                              finance.codeCurrency!
                            )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Comisiones:</span>
                <span className="flex flex-col items-end">
                  {financialReport.totalCommissions?.length
                    ? financialReport.totalCommissions.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(
                            finance.amount,
                            finance.codeCurrency
                          ) +
                            calculatePercent(
                              finance.amount!,
                              finance.codeCurrency!
                            )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Consumo casa:</span>
                <span className="flex flex-col items-end">
                  {financialReport.totalHouseCosted?.length
                    ? financialReport.totalHouseCosted.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(
                            finance.amount,
                            finance.codeCurrency
                          ) +
                            calculatePercent(
                              finance.amount!,
                              finance.codeCurrency!
                            )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos:</span>
                <span className="flex flex-col items-end">
                  {financialReport.taxes?.length
                    ? financialReport.taxes.map((finance, key) => (
                        <span key={key}
                          className={"text-" + colorByAmount(finance.amount)}
                        >
                          {formatCurrency(
                            finance.amount,
                            finance.codeCurrency
                          ) +
                            calculatePercent(
                              finance.amount!,
                              finance.codeCurrency!
                            )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
            </div>

            {/* En cuentas bancarias */}
            {includeBankOperations && (
              <div className="col-span-2">
                <div className="font-semibold pl-2">Operaciones bancarias</div>
                <GenericTable
                  tableTitles={["Concepto", "Ingreso", "Gasto", "Total"]}
                  //@ts-ignore
                  tableData={
                    financialReport.bankAccounts
                      ? financialReport.bankAccounts
                          .map((bankAccount) => {
                            return {
                              rowId: bankAccount.tagId,
                              payload: {
                                Concepto: <>{bankAccount.tag}</>,
                                Ingreso: (
                                  <div className="flex flex-col">
                                    {bankAccount.debit?.length
                                      ? bankAccount.debit.map((debit) => {
                                          debits.push(debit);
                                          return (
                                            <div
                                              className={
                                                "text-" +
                                                colorByAmount(debit.amount)
                                              }
                                            >
                                              {formatCurrency(
                                                debit.amount,
                                                debit.codeCurrency
                                              )}
                                            </div>
                                          );
                                        })
                                      : emptyValue()}
                                  </div>
                                ),
                                Gasto: (
                                  <div className="flex flex-col">
                                    {bankAccount.credit?.length
                                      ? bankAccount.credit.map((credit) => {
                                          credits.push(credit);
                                          return (
                                            <div
                                              className={
                                                "text-" +
                                                colorByAmount(credit.amount)
                                              }
                                            >
                                              {formatCurrency(
                                                credit.amount,
                                                credit.codeCurrency
                                              )}
                                            </div>
                                          );
                                        })
                                      : emptyValue()}
                                  </div>
                                ),
                                Total: (
                                  <div className="flex flex-col">
                                    {bankAccount.total?.length
                                      ? bankAccount.total.map((total) => {
                                          totals.push(total);
                                          return (
                                            <div
                                              className={
                                                "text-" +
                                                colorByAmount(total.amount)
                                              }
                                            >
                                              {formatCurrency(
                                                total.amount,
                                                total.codeCurrency
                                              )}
                                            </div>
                                          );
                                        })
                                      : emptyValue()}
                                  </div>
                                ),
                              },
                            };
                          })
                          .concat([
                            {
                              rowId: 1000,
                              payload: {
                                Concepto: (
                                  <span className="font-semibold">Totales</span>
                                ),
                                Ingreso: (
                                  <div className="flex flex-col">
                                    {debits?.length
                                      ? calculateAmountTotalOfDifferentCurrencies(
                                          debits
                                        ).map((debit) => {
                                          return (
                                            <div
                                              className={
                                                "text-" +
                                                colorByAmount(debit.amount)
                                              }
                                            >
                                              {formatCurrency(
                                                debit.amount,
                                                debit.codeCurrency
                                              )}
                                            </div>
                                          );
                                        })
                                      : emptyValue()}
                                  </div>
                                ),
                                Gasto: (
                                  <div className="flex flex-col">
                                    {credits?.length
                                      ? calculateAmountTotalOfDifferentCurrencies(
                                          credits
                                        ).map((credit) => {
                                          return (
                                            <div
                                              className={
                                                "text-" +
                                                colorByAmount(credit.amount)
                                              }
                                            >
                                              {formatCurrency(
                                                credit.amount,
                                                credit.codeCurrency
                                              )}
                                            </div>
                                          );
                                        })
                                      : emptyValue()}
                                  </div>
                                ),
                                Total: (
                                  <div className="flex flex-col">
                                    {totals?.length
                                      ? calculateAmountTotalOfDifferentCurrencies(
                                          totals
                                        ).map((total) => {
                                          return (
                                            <div
                                              className={
                                                "text-" +
                                                colorByAmount(total.amount)
                                              }
                                            >
                                              {formatCurrency(
                                                total.amount,
                                                total.codeCurrency
                                              )}
                                            </div>
                                          );
                                        })
                                      : emptyValue()}
                                  </div>
                                ),
                              },
                            },
                          ])
                      : []
                  }
                />
              </div>
            )}

            {/* En todas las monedas */}
            <div className="flex flex-col border p-4 gap-y-2">
              <div className="font-semibold">En todas las monedas</div>
              <div className="flex justify-between">
                <span>Total ingresado:</span>
                <span className="flex flex-col items-end">
                  {financialReport.generalIncomesCurrencies?.length
                    ? financialReport.generalIncomesCurrencies.map(
                        (finance, key) => (
                          <span
                            className={"text-" + colorByAmount(finance.amount!)}
                          >
                            {formatCurrency(
                              finance.amount!,
                              finance.codeCurrency
                            )}
                          </span>
                        )
                      )
                    : emptyValue()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total gastado:</span>
                <span className="flex flex-col items-end">
                  {financialReport.generalCostCurrencies?.length
                    ? financialReport.generalCostCurrencies.map((finance, key) => (
                        <span
                          className={"text-" + colorByAmount(finance.amount!)}
                        >
                          {formatCurrency(
                            finance.amount!,
                            finance.codeCurrency
                          )}
                        </span>
                      ))
                    : emptyValue()}
                </span>
              </div>
            </div>

            {/* En moneda principal */}
            <div className="flex flex-col border p-4 gap-y-2">
              <div className="font-semibold">En moneda principal</div>
              <div className="flex justify-between">
                <span>Total ingresado:</span>
                <span
                  className={
                    "text-" +
                    colorByAmount(
                      financialReport.generalIncomesMainCurrency.amount!
                    )
                  }
                >
                  {formatCurrency(
                    financialReport.generalIncomesMainCurrency.amount!,
                    financialReport.generalIncomesMainCurrency.codeCurrency
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total gastado:</span>
                <span
                  className={
                    "text-" +
                    colorByAmount(
                      financialReport.generalCostMainCurrency.amount!
                    )
                  }
                >
                  {formatCurrency(
                    financialReport.generalCostMainCurrency.amount!,
                    financialReport.generalCostMainCurrency.codeCurrency
                  ) +
                    calculatePercent(
                      financialReport.generalCostMainCurrency.amount!,
                      financialReport.generalCostMainCurrency.codeCurrency!
                    )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ganancia neta:</span>
                <span
                  className={
                    "text-" +
                    colorByAmount(financialReport.generalRevenue.amount!)
                  }
                >
                  {formatCurrency(
                    financialReport.generalRevenue.amount!,
                    financialReport.generalRevenue.codeCurrency
                  ) +
                    calculatePercent(
                      financialReport.generalRevenue.amount!,
                      financialReport.generalRevenue.codeCurrency!
                    )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSheet;
