import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import useServerBankAccount from '../../../api/useServerBankAccount';
import { formatCurrencyWithOutCurrency } from '../../../utils/helpers';

import EmptyList from '../../../components/misc/EmptyList';
import GenericTable, {
  DataTableInterface,
} from '../../../components/misc/GenericTable';
import Check from '../../../components/forms/GenericCheck';
import SpinnerLoading from '../../../components/misc/SpinnerLoading';
import { Link } from 'react-router-dom';

export default function BalanceReport() {
  const {
    balanceBankAccount,
    outLoading,
    getAllBalanceBankAccount,
    changeTotalReportState,
    isLoading,
  } = useServerBankAccount();

  //Declaración de la Variable Navegate para navegar a la ruta de detalle del BankAccount
  const navigate = useNavigate();

  useEffect(() => {
    getAllBalanceBankAccount();
  }, []);

  const totals = useMemo(() => {
    if (balanceBankAccount) {
      let newpayload: Record<
        string,
        string | number | boolean | React.ReactNode
      > = {
        'Cuenta Bancaria': 'Totales',
      };

      balanceBankAccount[0]?.currencies.map((key, idx) => {
        let value = 0;

        balanceBankAccount.map((item) => {
          item.currencies.map((currencie) => {
            if (item.active !== false) {
              if (currencie.codeCurrency === key.codeCurrency)
                value = value + currencie.amount;
            }
          });
        });

        value === 0
          ? (newpayload[key.codeCurrency] = (
              <span className='py-1 px-2 rounded-full text-black font-semibold'>
                {formatCurrencyWithOutCurrency(value, 'CUP') ?? 0}
              </span>
            ))
          : value < 0
          ? (newpayload[key.codeCurrency] = (
              <span className='py-1 px-2 rounded-full text-red-700 font-semibold'>
                {formatCurrencyWithOutCurrency(value, 'CUP') ?? 0}
              </span>
            ))
          : (newpayload[key.codeCurrency] = (
              <span className='py-1 px-2 rounded-full text-green-700 font-semibold'>
                {formatCurrencyWithOutCurrency(value, 'CUP') ?? 0}
              </span>
            ));
      });

      return newpayload;
    }
  }, [balanceBankAccount]);

  const tableTitles = ['Cuenta Bancaria'];

  balanceBankAccount[0]?.currencies?.map((item) => {
    tableTitles.push(item.codeCurrency);
  });

  const tableData: DataTableInterface[] = [];

  if (balanceBankAccount.length !== 0) {
    if (balanceBankAccount[0]?.currencies.length !== 0) {
      balanceBankAccount.map((item, idx) => {
        let payload: Record<
          string,
          string | number | boolean | React.ReactNode
        > = {
          /* "": (
            <Check
              value={idx}
              checked={item?.active ?? true}
              onChange={(e) =>
                changeTotalReportState(Number(e.target.value), e.target.checked)
              }
            />
          ), */
          'Cuenta Bancaria': (
            <>
              <Check
                value={idx}
                checked={item?.active ?? true}
                onChange={(e) =>
                  changeTotalReportState(
                    Number(e.target.value),
                    e.target.checked
                  )
                }
              />
              <Link
                to={`/bank_accounts/${item.accountId}`}
                className={`${item.active === false && 'line-through'} ml-4 text-sm font-medium text-gray-500 hover:text-gray-700`}
              >
                {item.accountName}
              </Link>
            </>
          ),
        };

        item.currencies.map((value) => {
          value.amount === 0
            ? (payload[value.codeCurrency] = (
                <span className='py-1 px-2 rounded-full text-black font-semibold'>
                  {formatCurrencyWithOutCurrency(
                    value.amount,
                    value.codeCurrency
                  ) ?? 0}
                </span>
              ))
            : (payload[value.codeCurrency] =
                value.amount < 0 ? (
                  <span className='py-1 px-2 rounded-full text-red-700 font-semibold'>
                    {formatCurrencyWithOutCurrency(
                      value.amount,
                      value.codeCurrency
                    ) ?? 0}
                  </span>
                ) : (
                  <span className='py-1 px-2 rounded-full text-green-700 font-semibold'>
                    {formatCurrencyWithOutCurrency(
                      value.amount,
                      value.codeCurrency
                    ) ?? 0}
                  </span>
                ));
        });
        tableData.push({ deletedRow: item.active === false, payload: payload });
              
      });
      totals && tableData.push({ payload: totals });
    }
  }

  //--------------------------------------------------------------------------------------------

  return (
    <div>
      {outLoading ? (
        <div className='bg-gray-100 py-10'>
          <SpinnerLoading text='Cargado balance... ' />
        </div>
      ) : balanceBankAccount.length !== 0 &&
        balanceBankAccount[0]?.currencies.length !== 0 ? (
        <GenericTable
          tableTitles={tableTitles}
          tableData={tableData}
          loading={isLoading}
        />
      ) : (
        <EmptyList
          title='Sin datos que mostrar'
          subTitle='No se han realizado operaciones con las cuentas'
        />
      )}
    </div>
  );
}
