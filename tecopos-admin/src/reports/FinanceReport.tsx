import {
  BusinessInterface,
  CurrenciesPaymentInterface,
  GeneralAreaIncome,
} from '../interfaces/ServerInterfaces';
import {
  calculateAmountTotalOfDifferentCurrencies,
  formatCurrency,
} from '../utils/helpers';
import Report from './components/Report';
import {
  calculatePercent,
  colorByAmount,
} from './helpers/commons';

interface FinanceReportProps {
  reportName: string;
  businessData: BusinessInterface;
  reportData: GeneralAreaIncome & { includeBankOperations: boolean };
}

const FinanceReport = ({
  reportName,
  businessData,
  reportData,
}: FinanceReportProps) => {
  const defaultAmount = () => {
    let amount = formatCurrency(0, businessData.costCurrency || 'CUP');
    amount += reportData.totalSalesInMainCurrency?.amount ? ' (0,00%)' : '';
    return amount + '~zero';
  };

  const generatePercentData = (
    amount: number,
    codeCurrency: string
  ): string => {
    return (
      ' (' +
      calculatePercent(
        amount!,
        reportData.totalSalesInMainCurrency?.amount,
        codeCurrency!,
        reportData.totalSalesInMainCurrency.codeCurrency,
        //@ts-ignore
        businessData.availableCurrencies
      ) +
      ')'
    ).replace('-', '');
  };

  const generateIncomeData = (
    initialData:
      | Partial<CurrenciesPaymentInterface>
      | Partial<CurrenciesPaymentInterface>[],
    includePercent = false
  ) => {
    if (Array.isArray(initialData)) {
      if (initialData.length) {
        return initialData.map((data) => {
          const color = colorByAmount(data.amount!);
          return (
            formatCurrency(data.amount || 0, data.codeCurrency) +
            (includePercent && reportData.totalSalesInMainCurrency?.amount
              ? generatePercentData(data.amount!, data.codeCurrency!)
              : '') +
            '~' +
            color
          );
        });
      }
      return defaultAmount();
    }
    return (
      formatCurrency(initialData?.amount || 0, initialData?.codeCurrency) +
      (includePercent && reportData.totalSalesInMainCurrency?.amount
        ? generatePercentData(
            initialData?.amount || 0,
            initialData?.codeCurrency!
          )
        : '') +
      '~' +
      colorByAmount(initialData?.amount || 0)
    );
  };

  let debits: Array<{ amount: number; codeCurrency: string }> = [];
  let credits: Array<{ amount: number; codeCurrency: string }> = [];
  let totals: Array<{ amount: number; codeCurrency: string }> = [];

  let data = [
    `${reportName}~title`,
    'titleSeparator',
    {
      display: 'section',
      widths: [
        [100, 1],
        [100, 1],
      ],
      subsections: [
        {
          'Ventas~subtitle': ' ',
          'Total:': generateIncomeData(reportData.totalSales),
          'Total en moneda principal:': generateIncomeData(
            reportData.totalSalesInMainCurrency
          ),
          'Costo total:': generateIncomeData(reportData.totalCost, true),
          'Ganancia:': generateIncomeData(
            {
              amount:
                reportData.totalSalesInMainCurrency?.amount -
                reportData.totalCost?.amount,
              codeCurrency: reportData.totalCost.codeCurrency,
            },
            true
          ),
        },
        {
          'Ingresos por cuentas~subtitle': ' ',
          'Total:': generateIncomeData(reportData.totalIncomesInCurrencies),
          'Total en moneda principal:': generateIncomeData(
            reportData.totalIncomesInMainCurrency,
            true
          ),
          'Por formas de pago~subtitle': ' ',
          'Efectivo:~indexed': generateIncomeData(
            reportData.totalIncomesInCash,
            true
          ),
          'Transferencia:~indexed': generateIncomeData(
            reportData.totalIncomesNotInCash.filter(
              //@ts-ignore
              (income) => income.paymentWay === 'TRANSFER'
            ),
            true
          ),
          'Tarjeta de crédito/débito:~indexed': generateIncomeData(
            reportData.totalIncomesNotInCash.filter(
              //@ts-ignore
              (income) => income.paymentWay === 'CARD'
            ),
            true
          ),
        },
      ],
    },
    'sectionSeparator',
    {
      display: 'section',
      widths: [
        [100, 1],
        [!reportData.includeBankOperations ? 100 : 31, 1],
      ],
      subsections: [
        !reportData.includeBankOperations && {
          'Operaciones de caja~subtitle': ' ',
          'Extracciones:': generateIncomeData(
            reportData.totalCashOperations.filter(
              (item) => item.operation === 'MANUAL_WITHDRAW'
            )
          ),
          'Depósitos:': generateIncomeData(
            reportData.totalCashOperations.filter(
              (item) => item.operation === 'MANUAL_DEPOSIT'
            )
          ),
          'Salarios:': generateIncomeData(reportData.totalSalary, true),
        },
        {
          'Otros~subtitle': ' ',
          'Propinas:': generateIncomeData(reportData.totalTips, true),
          'Envíos:': generateIncomeData(reportData.totalShipping),
          'Descuentos:': generateIncomeData(reportData.totalDiscounts, true),
          'Comisiones:': generateIncomeData(reportData.totalCommissions, true),
          'Consumo casa:': generateIncomeData(
            reportData.totalHouseCosted,
            true
          ),
          // 'Impuestos:': generateIncomeData(reportData.taxes, true),
        },
      ],
    },
  ];

  data =
    reportData.includeBankOperations && reportData.bankAccounts
      ? data.concat([
          'sectionSeparator',
          'Operaciones bancarias~subtitle',
          'titleSeparator',
          {
            display: 'table',
            //@ts-ignore
            headers: ['Concepto', 'Ingreso', 'Gasto', 'Total'],
            values: reportData.bankAccounts.map((account) => {
              debits = debits.concat(account.debit);
              credits = credits.concat(account.credit);
              totals = totals.concat(account.total);

              return [
                account.tag,
                account.debit.map((debit) => generateIncomeData(debit)),
                account.credit.map((credit) => generateIncomeData(credit)),
                account.total.map((total) => generateIncomeData(total)),
              ];
            }),
            totals: [
              'Totales~subtitle',
              calculateAmountTotalOfDifferentCurrencies(debits).map((debit) =>
                generateIncomeData(debit)
              ),
              calculateAmountTotalOfDifferentCurrencies(credits).map((credit) =>
                generateIncomeData(credit)
              ),
              calculateAmountTotalOfDifferentCurrencies(totals).map((total) =>
                generateIncomeData(total)
              ),
            ],
          },
        ])
      : data;

  //@ts-ignore
  data = data.concat([
    'sectionSeparator',
    {
      display: 'section',
      widths: [
        [100, 1],
        [100, 1],
      ],
      subsections: [
        {
          'En todas las monedas~subtitle': ' ',
          'Total ingresado:': generateIncomeData(
            reportData.generalIncomesCurrencies
          ),
          'Total gastado:': generateIncomeData(
            reportData.generalCostCurrencies
          ),
        },
        {
          'En moneda principal~subtitle': ' ',
          'Total ingresado:': generateIncomeData(
            reportData.generalIncomesMainCurrency
          ),
          'Total gastado:': generateIncomeData(
            reportData.generalCostMainCurrency,
            true
          ),
          'Ganancia neta:': generateIncomeData(reportData.generalRevenue, true),
        },
      ],
    },
  ]);

  return (
    <Report
      reportName={reportName}
      reportData={data}
      headerData={businessData}
    />
  );
};
export default FinanceReport;
