import React, { useEffect, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { toast } from "react-toastify";
import APIServer from "../../api/APIServices";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExchangeAlt,
  faSpinner,
  faChartBar,
} from "@fortawesome/free-solid-svg-icons";
import { useParams } from "react-router-dom";
import SpinnerLoading from "../misc/SpinnerLoading";

export default function Metric() {
  const {business} = useAppSelector(state=>state.init);
  const { ecoCycleId: id } = useParams();
  const [listUserTip, setListUserTip] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
        //APIServer.get(`/report/incomes/economic-cycle/${id}`),
        APIServer.get(`/report/tips/${id}`)
        .then((resp) => {
          const salesIncomes = resp.data;

          let totalInCash = [];
          let totalOperations = [];

          // salesIncomes?.totalIncomesByPaymentWay.forEach((item) => {
          //   if (item.paymentWay === "CASH") {
          //     totalInCash.push(item);
          //   }
          // });

          // //Analyzing tips
          // salesIncomes?.totalTips.forEach((item) => {
          //   const found = totalInCash.find(
          //     (cash) => cash.codeCurrency === item.codeCurrency
          //   );

          //   if (found) {
          //     totalInCash = totalInCash.map((cash) => {
          //       if (cash.codeCurrency === item.codeCurrency) {
          //         return {
          //           ...cash,
          //           amount: cash.amount + item.amount,
          //         };
          //       }

          //       return cash;
          //     });
          //   } else {
          //     totalInCash = [...totalInCash, item];
          //   }
          // });

          // //Analyzing cash operations
          // salesIncomes?.totalCashOperations.forEach((item) => {
          //   const found = totalInCash.find(
          //     (cash) => cash.codeCurrency === item.codeCurrency
          //   );

          //   if (found) {
          //     totalInCash = totalInCash.map((cash) => {
          //       if (cash.codeCurrency === found.codeCurrency) {
          //         return {
          //           ...cash,
          //           amount: cash.amount + item.amount,
          //         };
          //       }

          //       return cash;
          //     });
          //   } else {
          //     totalInCash = [...totalInCash, item];
          //   }
          // });

          // resp[0].data.totalIncomes.length > 0 &&
          //   setTotalIncome(resp[0].data.totalIncomes[0].amount);
          // resp[0].data.totalSales.length > 0 &&
          //   setTotalSales(resp[0].data.totalSales[0].amount);
          // resp[0].data.taxes.length > 0 &&
          //   setTaxes(resp[0].data.taxes[0].amount);
          // resp[0].data.totalTips.length > 0 &&
          //   setTotalTips(resp[0].data.totalTips[0].amount);
          setListUserTip(resp.data);

          setIsLoading(false);
        })
        .catch((error) => {
          const message = error.response.data.message;
          if (message) {
            toast.error(message);
          } else {
            toast.error(
              "Ha ocurrido un error mientras se cargaban las métricas"
            );
          }
          setIsLoading(false);
        });
    })();
  }, []);

  return (
    <div className=" max-w-6xl  ">
      {/* <BarChart
        scores={[totalIncome, totalSales, taxes, totalTips]}
        max={totalSales * 1.5}
        backgroundColor={[
          "rgba(249, 65, 68, 0.2)",
          "rgba(243, 114, 44, 0.2)",
          "rgba(249, 199, 79, 0.2)",
          "rgba(67, 170, 139, 0.2)",
        ]}
        borderColor={[
          "rgb(249, 65, 68)",
          "rgb(243, 114, 44)",
          "rgb(249, 119, 79)",
          "rgb(67, 170, 139)",
        ]}
      /> */}

      {!isLoading && listUserTip.length === 0 && (
        <div className="text-center mt-10">
          <FontAwesomeIcon
            icon={faChartBar}
            className="h-16 w-16 mt-3 text-gray-500 "
            aria-hidden="true"
          />
          <h3 className="mt-2 text-sm font-medium text-gray-500">
            No hay métricas que mostrar
          </h3>
        </div>
      )}

      {isLoading && <SpinnerLoading />}

      {!isLoading && listUserTip.length !== 0 && (
        <div className="relative mt-10 overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 text-left py-3">
                  Dependiente
                </th>
                <th scope="col" className="px-6 py-3">
                  Total de Propinas por monedas
                </th>
                <th scope="col" className="px-6 py-3">
                  Total de Propinas por moneda principal
                </th>
              </tr>
            </thead>
            <tbody>
              {listUserTip.map((item, index) => (
                <tr
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                  key={index}
                >
                  <th
                    scope="row"
                    className="px-6 py-4 text-left font-medium text-gray-900 dark:text-white whitespace-nowrap"
                  >
                    {item.displayName}
                  </th>
                  <th
                    scope="row"
                    className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                  >
                    {item.totalTips.map((tip) => {
                      return tip.amount + " " + tip.codeCurrency;
                    })}
                  </th>
                  <th
                    scope="row"
                    className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white whitespace-nowrap"
                  >
                    {item.totalTipMainCurrency.amount +
                      " " +
                      item.totalTipMainCurrency.codeCurrency}
                  </th>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
