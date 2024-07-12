import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import moment from "moment";
import query from "../../api/APIServices";
import {
  CurrencyInterface,
  LastIncomesInterface,
} from "../../interfaces/ServerInterfaces";
import { roundToTwoDecimal } from "../../utils/functions";
import { setBusinessId } from "../slices/sessionSlice";
import { generateUrlParams } from "../../utils/helpers";
import { GraphDataInterface } from "../slices/auxiliarSlice";
import { AxiosResponse } from "axios";
import bigDecimal from "js-big-decimal";

export const initSystem = createAction<any>("general/initSystem");

export const closeSystem = createAction<any>("general/closeSystem");

export const changeBusiness = createAsyncThunk(
  "general/load",
  async (businessId: number | null, thunkAPI) => {
    thunkAPI.dispatch(setBusinessId(businessId));
    return await Promise.all([
      query.get("/security/user"), //User data
      query.get("/administration/my-branches"), //Branches Data
      query.get("/administration/area?all_data=true"), //Areas
      query.get("/administration/measures"), // Measures
      query.get("/administration/productcategory?all_data=true"), //Product Categories
      query.get("/administration/salescategory?all_data=true"), //Product Categories Sales
      query.get("/security/users?all_data=true"), //System Users
      query.get("/security/roles/admin"), //roles
      query.get("/administration/my-business"), //business information
      query.get("/administration/variation/attributes"),
      query.get("/administration/supplier?all_data=true"), //Suppliers
      query.get(`/administration/paymentways`), //paymentWays
      query.get(`/administration/humanresource/personcategory?all_data=true`), //personCategories
      query.get(`/administration/humanresource/personpost?all_data=true`), //personPosts
      query.get(`/administration/fixedcostcategory?all_data=true`), //FixedCost
    ]).then((resp) => {
      return {
        user: resp[0].data,
        branches: resp[1].data,
        areas: resp[2].data.items,
        measures: resp[3].data,
        productCategories: resp[4].data.items,
        salesCategories: resp[5].data.items,
        businessUsers: resp[6].data.items,
        roles: resp[7].data,
        business: resp[8].data,
        product_attributes: resp[9].data,
        suppliers: resp[10].data.items,
        paymentWays: resp[11].data,
        personCategories: resp[12].data.items,
        personPosts: resp[13].data.items,
        fixedCostCategories: resp[14].data.items,
      };
    });
  }
);

export const getGraphData = createAsyncThunk(
  "general/commonGraph",
  async (
    {
      dateMode,
      dateRange,
      businessMode,
    }: {
      dateMode: "yesterday" | "today" | "week" | "month" | "year" | "custom";
      dateRange?: { dateFrom: string; dateTo: string };
      businessMode: "single" | "group";
    },
    thunkAPI
  ) => {
    let currentQuery: Promise<AxiosResponse<any, any>>[];
    const business = (thunkAPI.getState() as any).init.business;
    const { availableCurrencies } = business;

    if (businessMode === "single") {
      currentQuery = [
        query.get(`/report/incomes/sales/${dateMode}`),
        query.get(`/report/selled-products/most-selled/${dateMode}`),
      ];
    } else if (
      businessMode === "group" &&
      ["yesterday", "today", "custom"].includes(dateMode)
    ) {
      currentQuery = [
        query.get(
          `/report/incomes/v2/total-sales${generateUrlParams(dateRange)}`
        ),
      ];
    } else {
      currentQuery = [
        query.get(`/report/incomes/sales/${dateMode}`),
        query.get(`/report/selled-products/most-selled/${dateMode}`),
        query.get(
          `/report/incomes/v2/total-sales${generateUrlParams(dateRange)}`
        ),
      ];
    }

    const apiQuery = await Promise.all(currentQuery).then((resp) => {
      let dataToSend: GraphDataInterface | null = {
        businessMode: businessMode,
        dateMode,
      };

      if (
        businessMode === "single" ||
        (businessMode === "group" &&
          !["yesterday", "today", "custom"].includes(dateMode))
      ) {
        //business graph data------------------------------------------------
        let costCurrency: string[] = [];
        let mainCodeCurrency: string[] = [];
        let axisLabel: string[] = [];
        let totalSales: number[] = [];
        let totalCost: number[] = [];
        let grossProfit: number[] = [];
        let totalIncomes: number[] = [];
        let maxValue: number = 0;
        let minValue: number = 0;
        const sortedData = resp[0].data.sort((a: any, b: any) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return Number(dateA) - Number(dateB);
        });
        sortedData.forEach((item: LastIncomesInterface) => {
          if (item.date) {
            switch (dateMode) {
              case "week":
                axisLabel.push(moment(item.date).format("ddd D"));
                break;
              case "month":
                axisLabel.push(moment(item.date).format("ddd D / M"));
                break;
              case "year":
                axisLabel.push(moment(item.date).format("MMMM Y"));
                break;

              default:
                break;
            }

            let cost = item.totalCost;

            if (item.costCurrency !== item.mainCodeCurrency) {
              const costRate = (
                availableCurrencies as CurrencyInterface[]
              ).find(
                (currency: CurrencyInterface) =>
                  currency.code === item.costCurrency
              )?.exchangeRate;

              const costInMainCurrency = bigDecimal.multiply(
                cost,
                costRate
              );

              cost = Number(costInMainCurrency);
            }

            costCurrency.push(item.costCurrency);
            mainCodeCurrency.push(item.mainCodeCurrency);
            totalSales.push(roundToTwoDecimal(item.totalSales));
            totalCost.push(roundToTwoDecimal(cost));
            grossProfit.push(roundToTwoDecimal(item.grossProfit));
            totalIncomes.push(roundToTwoDecimal(item.totalIncomes));

            const maxItem = Math.max(
              item.totalSales,
              cost,
              item.grossProfit,
              item.totalIncomes
            );

            const minItem = Math.min(
              item.totalSales,
              cost,
              item.grossProfit,
              item.totalIncomes
            );
            if (maxItem > maxValue) {
              maxValue = maxItem;
            }
            if (minItem < minValue) {
              minValue = minItem;
            }
          }
        });
        dataToSend.dateRange = {
          dateFrom: sortedData[0].date,
          dateTo: sortedData[sortedData.length - 1].date,
        };
        dataToSend.businessData = {
          costCurrency,
          mainCodeCurrency,
          axisLabel,
          totalSales,
          totalCost,
          grossProfit,
          totalIncomes,
          maxValue,
          minValue,
          mostSelled: resp[1].data,
        };

        //------------------------------------------------------------
      }

      if (businessMode === "group") {
        dataToSend.groupData = ["yesterday", "today", "custom"].includes(
          dateMode
        )
          ? resp[0].data
          : resp[2].data;
      }
      return dataToSend;
    });

    return apiQuery;
  }
);
