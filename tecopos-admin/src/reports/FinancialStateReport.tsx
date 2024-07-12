import {
  BankAccountInterfaces,
  BusinessInterface,
  FinancialBankAccountInterface,
} from '../interfaces/ServerInterfaces';
import { formatCurrency } from '../utils/helpers';
import Report from './components/Report';
import moment from 'moment';

interface FinancialStateReportProps {
  reportName: string;
  businessData: BusinessInterface;
  reportData: {
    financialStates: FinancialBankAccountInterface[];
    bankAccounts: Partial<BankAccountInterfaces>[];
    initialDate: string;
    finalDate: string;
  };
}

const FinancialStateReport = ({
  reportName,
  businessData,
  reportData,
}: FinancialStateReportProps) => {

  let totals: Record<string, Record<string, number>> = {};

  const calculateTotals = (type: string, currency: string, amount: number) => {
    totals = {
      ...totals,
      [type]: {
        ...totals[type],
        [currency]: ((totals[type] && totals[type][currency]) || 0) + amount,
      },
    };
  };

  const data = [
    `${reportName}~title`,
    'titleSeparator',
    {
      display: 'section',
      widths: [[24, 1]],
      subsections: [
        {
          'Fecha inicial:': moment(reportData.initialDate).format(
            'DD [de] MMMM [de] YYYY'
          ),
          'Fecha final:': moment(reportData.finalDate).format(
            'DD [de] MMMM [de] YYYY'
          ),
          'Cuentas bancarias:': reportData.bankAccounts
            .map((bankAccount) => bankAccount.name)
            .join(', '),
        },
      ],
    },
    'sectionSeparator',
    {
      display: 'table',
      headers: ['Concepto', 'Ingreso', 'Gasto', 'Total'],
      values: reportData.financialStates.map((financialState) => [
        financialState.tag,
        financialState.debit.map((debit) => {
          calculateTotals('debit', debit.codeCurrency, debit.amount);
          return (
            formatCurrency(debit.amount, debit.codeCurrency) +
            `~${debit.amount < 0 ? 'negative' : 'positive'}`
          );
        }),
        financialState.credit.map((credit) => {
          calculateTotals('credit', credit.codeCurrency, credit.amount);
          return (
            formatCurrency(credit.amount, credit.codeCurrency) +
            `~${credit.amount < 0 ? 'negative' : 'positive'}`
          );
        }),
        financialState.total.map((total) => {
          calculateTotals('total', total.codeCurrency, total.amount);
          return (
            formatCurrency(total.amount, total.codeCurrency) +
            `~${total.amount < 0 ? 'negative' : 'positive'}`
          );
        }),
      ]),
      totals: [
        'Totales~subtitle',
        Object.keys(totals.debit || {}).map(
          (currency) =>
            formatCurrency(totals.debit[currency], currency) +
            `~${totals.debit[currency] < 0 ? 'negative' : 'positive'}`
        ),
        Object.keys(totals.credit || {}).map(
          (currency) =>
            formatCurrency(totals.credit[currency], currency) +
            `~${totals.credit[currency] < 0 ? 'negative' : 'positive'}`
        ),
        Object.keys(totals.total || {}).map(
          (currency) =>
            formatCurrency(totals.total[currency], currency) +
            `~${totals.total[currency] < 0 ? 'negative' : 'positive'}`
        ),
      ],
    },
  ];

  return (
    <Report
      reportName={reportName}
      reportData={data}
      headerData={businessData}
    />
  );
};
export default FinancialStateReport;
