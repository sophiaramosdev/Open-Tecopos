import { createSlice, isAnyOf } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { MostSelledInterface } from "../../interfaces/ServerInterfaces";
import {
  changeBusiness,
  closeSystem,
  getGraphData,
  initSystem,
} from "../actions/globals";

interface BusinessGraphData {
  costCurrency: string[];
  mainCodeCurrency: string[];
  axisLabel: string[];
  totalSales: number[];
  totalCost: number[];
  grossProfit: number[];
  maxValue: number;
  minValue: number;
  mostSelled: MostSelledInterface[];
  totalIncomes: number[];
}
// v1
// interface GroupGraphData {
//   id: number;
//   name: string;
//   totalSales: number;
//   totalCost: number;
//   grossProfit: number;
//   totalIncomes: number;
//   codeCurrency: string;
// }
// v2
interface GroupGraphData {
  id: number;
  name: string;
  totalCost: number;
  grossProfit: number;
  codeCurrency: string;
  totalIncomes: Array<{
    amount: number;
    codeCurrency: string;
    paymentWay: string;
  }>;
  totalSales: Array<any>;
  totalSalesMainCurerncy: number;
  totalIncomesMainCurrency: number;
  economicCyclesIds: Array<number>;
  costCurrency: string;
}

export interface GraphDataInterface {
  businessMode: "single" | "group" | null;
  dateMode?: "yesterday" | "today" | "week" | "month" | "year" | "custom";
  dateRange?: { dateFrom: string; dateTo: string } | null;
  businessData?: BusinessGraphData;
  groupData?: GroupGraphData[];
}

interface AuxData {
  loading: boolean;
  graphsData: GraphDataInterface | null;
}

const auxiliarData: AuxData = {
  loading: false,
  graphsData: null,
};

const auxiliarSlice = createSlice({
  name: "auxiliar",
  initialState: auxiliarData,
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(getGraphData.pending, (state) => ({
        ...state,
        loading: true,
      }))
      .addCase(getGraphData.fulfilled, (state, action) => ({
        loading: false,
        graphsData: action.payload,
      }))
      .addCase(getGraphData.rejected, (state, action) => {
        toast.error(action.error.message);
        return { ...state, loading: false };
      })
      .addMatcher(isAnyOf(closeSystem, changeBusiness.pending), (state) => ({
        ...state,
        graphsData: null,
      })),
});

//export const {} = auxiliarSlice.actions;
export default auxiliarSlice.reducer;

isAnyOf(initSystem, changeBusiness.fulfilled);
