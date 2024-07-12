import React, { useEffect, useMemo, useState } from 'react';

import useServerBankAccount from '../../../api/useServerBankAccount';

import { SelectInterface } from '../../../interfaces/InterfacesLocal';

import GenericTable, {
  DataTableInterface,
} from '../../../components/misc/GenericTable';

import {
  formatCurrency,
  formatCurrencyWithOutCurrency,
} from '../../../utils/helpers';

import { SubmitHandler, useForm } from 'react-hook-form';

import DateInput from '../../../components/forms/DateInput';
import { useAppSelector } from '../../../store/hooks';
import Button from '../../../components/misc/Button';
import Check from '../../../components/forms/GenericCheck';
import MultiSelect from '../../../components/forms/Multiselect';
import reportDowloadHandler from '../../../reports/helpers/reportDownloadHandler';
import { FaRegFilePdf } from 'react-icons/fa';

export default function FinancialState() {
  const { handleSubmit, control, getValues } = useForm();

  const { business } = useAppSelector((state) => state.init);

  const {
    allBankAccount,
    getAllBankAccountWithOutFilter,
    outLoading,
    isFetching,
    financialBankAccount,
    getAllFinancialBankAccount,
  } = useServerBankAccount();

  //Select asociated AccountTag data ------------------------------------------------------------------

  useEffect(() => {
    getAllBankAccountWithOutFilter();
  }, []);

  const [financialsItems, setFinancialsItems] = useState<
    {} & Record<string, any>
  >({});

  const updateFinancialsItems = (financialId: number, active: boolean) => {
    setFinancialsItems({
      ...financialsItems,
      // @ts-ignore
      [financialId]: { active },
    });
  };

  const createAmountsCell = (
    id: number,
    items: { amount: number; codeCurrency: string }[]
  ) =>
    items.map((item, key) => (
      <span
        key={key}
        // @ts-ignore
        className={`flex items-start py-1 px-2 rounded-full text-${item.amount > 0
            ? 'green-700'
            : item.amount === 0
              ? 'black'
              : 'red-700'
          } font-semibold justify-center ${excludeRow(id)}`}
      >
        {formatCurrency(item.amount, item.codeCurrency) ?? 0}
      </span>
    ));

  // @ts-ignore
  const excludeRow = (rowId: number) =>
    financialsItems[rowId.toString()]?.active === false ? 'line-through' : '';

  const totals = useMemo(() => {
    if (financialBankAccount.length) {
      let totalPayload: Record<
        string,
        string | number | boolean | React.ReactNode
      > = {
        Concepto: 'Totales',
      };
      let debitTotals = {};
      let creditTotals = {};
      let totalTotals = {};
      for (const item of financialBankAccount) {
        // @ts-ignore
        if (
          !financialsItems[item.tagId.toString()] ||
          financialsItems[item.tagId.toString()].active === true
        ) {
          for (const debit of item.debit) {
            // @ts-ignore
            debitTotals[debit.codeCurrency] = debitTotals[debit.codeCurrency]
              ? debitTotals[debit.codeCurrency as keyof typeof debitTotals] +
              debit.amount
              : debit.amount;
          }
          for (const credit of item.credit) {
            // @ts-ignore
            creditTotals[credit.codeCurrency] = creditTotals[
              credit.codeCurrency
            ]
              ? creditTotals[credit.codeCurrency as keyof typeof creditTotals] +
              credit.amount
              : credit.amount;
          }
          for (const total of item.total) {
            // @ts-ignore
            totalTotals[total.codeCurrency] = totalTotals[total.codeCurrency]
              ? totalTotals[total.codeCurrency as keyof typeof totalTotals] +
              total.amount
              : total.amount;
          }
        }
      }
      const debits = Object.keys(debitTotals).map((key) => ({
        // @ts-ignore
        amount: debitTotals[key],
        codeCurrency: key,
      }));
      totalPayload['Ingreso'] = debits.length ? (
        // @ts-ignore
        createAmountsCell(0, debits)
      ) : (
        <span className='flex py-1 px-2 rounded-full font-semibold justify-center'>
          {formatCurrencyWithOutCurrency(0)}
        </span>
      );
      const credits = Object.keys(creditTotals).map((key) => ({
        // @ts-ignore
        amount: creditTotals[key],
        codeCurrency: key,
      }));
      // @ts-ignore
      totalPayload['Gasto'] = credits.length ? (
        createAmountsCell(0, credits)
      ) : (
        <span className='flex py-1 px-2 rounded-full font-semibold justify-center'>
          {formatCurrencyWithOutCurrency(0)}
        </span>
      );
      const totals = Object.keys(totalTotals).map((key) => ({
        // @ts-ignore
        amount: totalTotals[key],
        codeCurrency: key,
      }));
      // @ts-ignore
      totalPayload['Total'] = totals.length ? (
        createAmountsCell(0, totals)
      ) : (
        <span className='flex py-1 px-2 rounded-full font-semibold justify-center'>
          {formatCurrencyWithOutCurrency(0)}
        </span>
      );

      return totalPayload;
    }
  }, [financialBankAccount, financialsItems]);

  const selectDataAccount: SelectInterface[] = [];

  allBankAccount.map((item) => {
    selectDataAccount.push({
      id: item.id,
      name: item.name,
      disabled: false,
    });
  });

  const selectBusiness: SelectInterface[] = [];

  business?.availableCurrencies.map((item) => {
    selectBusiness.push({
      id: item.code,
      name: item.code,
      disabled: false,
    });
  });

  //--------------------------------------------------------------------------------------------

  //Data for Table List --------------------------------------------------------------------

  const titles: string[] = ['Concepto', 'Ingreso', 'Gasto', 'Total'];
  const displayData: Array<DataTableInterface> = [];

  financialBankAccount.forEach((item) =>
    displayData.push({
      rowId: item.tagId,
      payload: {
        Concepto: (
          <div className={`flex flex-row gap-4 ${excludeRow(item.tagId)}`}>
            <Check
              value={item.tagId}
              // @ts-ignore
              checked={financialsItems[item.tagId]?.active ?? true}
              onChange={(e) =>
                // @ts-ignore
                updateFinancialsItems(Number(e.target.value), e.target.checked)
              }
            />
            {item?.tag ? item?.tag : '---'}
          </div>
        ),
        Ingreso: createAmountsCell(item.tagId, item.debit),
        Gasto: createAmountsCell(item.tagId, item.credit),
        Total: createAmountsCell(item.tagId, item.total),
      },
    })
  );
  totals && displayData.push({ payload: totals });

  //--------------------------------------------------------------------------------------------------------

  const onSubmit: SubmitHandler<Record<string, number>> = (data) => {
    let newFilter = {
      accountIds: data.bankAccounts,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
    };

    // @ts-ignore
    getAllFinancialBankAccount(newFilter);
  };

  //--------------------------------------------------------------------------------------

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className='py-2'>
        <div className='h-50 border border-slate-300 rounded p-2 overflow-y-visible'>
          <div className='h-50'>
            <div className='md:grid md:grid-cols-2 md:gap-2'>
              <div className='py-2'>
                <DateInput
                  name={'dateFrom'}
                  label={'Fecha inicial'}
                  control={control}
                  rules={{ required: 'Este campo es requerido' }}
                  untilToday
                  includeTime
                />
              </div>
              <div className='py-2'>
                <DateInput
                  name={'dateTo'}
                  label={'Fecha final'}
                  control={control}
                  rules={{ required: 'Este campo es requerido' }}
                  untilToday
                  includeTime
                />
              </div>
              <div className='py-1 col-span-2'>
                <MultiSelect
                  name='bankAccounts'
                  data={selectDataAccount.map((item) => ({
                    id: item.id,
                    name: item.name,
                  }))}
                  label='Cuentas bancarias *'
                  control={control}
                  rules={{ required: 'Este campo es requerido' }}
                  defaultValue={() => { }}
                />
              </div>
            </div>
          </div>

          <div className='px-4 py-3 bg-slate-50 text-right sm:px-6'>
            <Button
              color='gray-600'
              type='submit'
              name='Buscar'
              loading={isFetching}
              disabled={isFetching}
            />
          </div>
        </div>
      </form>

      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        loading={outLoading}
        actions={
          displayData.length
            ? [
              {
                title: 'Exportar',
                icon: <FaRegFilePdf className='h-5 text-gray-500' />,
                action: () => {
                  reportDowloadHandler(
                    'Estado Financiero',
                    'financial_state',
                    business!,
                    {
                      financialStates: financialBankAccount,
                      financialStatesTotals: totals,
                      initialDate: getValues('dateFrom'),
                      finalDate: getValues('dateTo'),
                      bankAccounts: allBankAccount?.map((item) => {
                        return {
                          id: item.id,
                          name: item.name,
                          disabled: false,
                        }
                      }).filter((account) => {
                        return getValues('bankAccounts').some(
                          (accountId: number) => accountId === account.id
                        );
                      }),
                    }
                  );
                },
              },
            ]
            : undefined
        }
      />
    </>
  );
}
