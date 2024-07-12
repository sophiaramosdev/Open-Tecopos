import { useEffect } from "react";
import { AvailableCurrency, SimplePrice } from "../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../store/hooks";
import { exchangeCurrency, prettyNumber } from "../../utils/helpers";
import LoadingSpin from "./LoadingSpin"
import { ReportInterface } from "./ReportsComponent";
import useServerBusiness from "../../api/useServerBusiness";
import { printPriceWithCommasAndPeriods } from "../../utils/functions";

interface SummaryStockListProps {
  isLoading: boolean;
  body: Record<string, string | number | React.ReactNode> | ReportInterface[];
  lastRowColor: string;
  activeCurrency: string;
}

export const SummaryStockList = ({ isLoading, body, lastRowColor, activeCurrency }: SummaryStockListProps) => {
  //Global State 
  const { business } = useAppSelector(store => store.init)
  const { allCurrencies, getCurrencies } = useServerBusiness();
  // Local State
  const rowBodyTitles = Object.keys(body)
  const rowBodyData = Object.values(body)
  const activeCurrencies = business?.availableCurrencies.filter(currency => currency.isActive)
  // Effects
  useEffect(() => {
    getCurrencies();
  }, []);

  // functions
  const dataBodyToObject: Array<SimplePrice> | number = rowBodyData.map((data) => {
    if (typeof data === 'string') {

      const [amountString, codeCurrency] = data.trim().split(/\s+/);

      const amount = Number(amountString.replace(/[.]/g, '').replace(/[,]/g, '.'));
      return { amount, codeCurrency }
    }
    return data
  })

  const convertionCurrencies = dataBodyToObject.map((currencyMain) => {

    if (typeof currencyMain !== 'number') {
      const convertedCurrency = activeCurrencies?.map(activeCurrency => exchangeCurrency(currencyMain, activeCurrency.code, allCurrencies as AvailableCurrency[]))

      if (convertedCurrency) {
        return convertedCurrency;
      } else {
        return null;
      }
    }
  });
  const rowListToRender = rowBodyTitles.map((title, idx) => {
    return {
      rowTitle: title,
      initialData: dataBodyToObject[idx],
      exchangeCurrency: convertionCurrencies[idx]
    }
  })

  return (
    <>
      {
        isLoading ?? false
          ? <div className="w-full h-full flex justify-center items-center">
            <LoadingSpin color="black" />
          </div>
          :
          <div className='overflow-hidden bg-white shadow sm:rounded-lg'>
            <div className='border-t border-gray-200'>
              <table className="w-full">

                {
                  rowListToRender.map((rowInfo, idx) => {
                    return (
                      <tr
                        key={idx}
                        className={`${idx % 2 !== 0 && "bg-gray-100"
                          } grid gap-4 grid-cols-${activeCurrencies ? activeCurrencies?.length + 1 : 2} h-16 px-2 py-3 sm:px-4 scrollbar-thin justify-center items-center`}
                      >

                        <td className={`scrollbar-thin overflow-x-auto text-sm  ${(lastRowColor !== undefined && lastRowColor !== null && Object.entries(body).length === (idx + 1)) ? ("text-" + lastRowColor) : "text-gray-900"}`}>
                          {rowInfo.rowTitle}
                        </td>

                        {
                          (rowInfo.exchangeCurrency && rowInfo.exchangeCurrency.length > 0)
                            ?
                            (
                              rowInfo.exchangeCurrency?.filter(exchangeCurr => exchangeCurr?.codeCurrency === activeCurrency).map((exchangeCurrency, indx) => {
                                return (
                                  <td key={indx} className={`scrollbar-thin overflow-x-auto text-sm  ${(lastRowColor !== undefined && lastRowColor !== null && Object.entries(body).length === (idx + 1)) ? ("text-" + lastRowColor) : "text-gray-900"}`}>
                                    {printPriceWithCommasAndPeriods(exchangeCurrency?.amount)} {exchangeCurrency?.codeCurrency}
                                  </td>
                                )

                              })
                            )
                            : <>{rowInfo.initialData}</>
                        }
                      </tr>
                    )
                  })
                }
              </table>
            </div>
          </div>
      }
    </>

  )
}
