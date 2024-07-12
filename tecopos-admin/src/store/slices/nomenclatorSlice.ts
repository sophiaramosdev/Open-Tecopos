import { createSlice, isAnyOf } from "@reduxjs/toolkit";
import { SelectInterface } from "../../interfaces/InterfacesLocal";
import {
  AreasInterface,
  AttributeInterface,
  FixedCostCategoriesInterface,
  MeasuresNomenclator,
  PaymentMethodsInterface,
  PersonCategory,
  PostInterface,
  ProductCategoriesInterface,
  RolesInterface,
  SalesCategories,
} from "../../interfaces/ServerInterfaces";
import { changeBusiness, initSystem } from "../actions/globals";

interface elToqueRateInterface {
  tasas: {
    MLC: number;
    ECU: number;
    USD: number;
    USDT_TRC20: number;
    BTC: number;
  };
  date: string;
  hour: number;
  minutes: number;
  seconds: number;
}

interface InitialData {
  areas: AreasInterface[];
  measures: MeasuresNomenclator[];
  productCategories: ProductCategoriesInterface[];
  salesCategories: SalesCategories[];
  businessUsers: SelectInterface[];
  roles: RolesInterface[];
  product_attributes: AttributeInterface[];
  paymentWays: PaymentMethodsInterface[];
  personCategories: PersonCategory[];
  personPosts: PostInterface[];
  elToqueRates: elToqueRateInterface | null;
  titlesForExport: string[];
  fixedCostCategories: FixedCostCategoriesInterface[];
}

const initialState: InitialData = {
  areas: [],
  measures: [],
  productCategories: [],
  salesCategories: [],
  businessUsers: [],
  roles: [],
  product_attributes: [],
  paymentWays: [],
  personCategories: [],
  personPosts: [],
  elToqueRates: null,
  titlesForExport: [""],
  fixedCostCategories: [],
};

const nomenclatorSlice = createSlice({
  initialState,
  name: "nomenclators",
  reducers: {
    //areas---------------------------------------------------------------------------------------
    updateAreas: (state, action) =>
      (state = { ...state, areas: [action.payload, ...state.areas] }),
    updateCurrentArea: (state, action) => {
      const element = state.areas.findIndex(
        (item) => item.id === action.payload.id
      );
      state.areas.splice(element, 1, action.payload);
    },
    updateAreaAfterDelete: (state, action) => {
      state.areas.splice(
        state.areas.findIndex((item) => item.id === Number(action.payload)),
        1
      );
    },
    //measure------------------------------------------------------------------------------------------
    setMeasures: (state, action) =>
      (state = { ...state, measures: action.payload }),
    //product categories ------------------------------------------------------------------
    setProductCategories: (state, action) =>
      (state = { ...state, productCategories: action.payload }),
    addProductCategory: (state, action) =>
      (state = {
        ...state,
        productCategories: [...state.productCategories, action.payload],
      }),
    updateProductCategory: (state, action) => {
      const element = state.productCategories.findIndex(
        (item) => item.id === action.payload.id
      );
      state.productCategories.splice(element, 1, action.payload);
    },
    updateProductCategoryAfterDelete: (state, action) => {
      state.productCategories.splice(
        state.productCategories.findIndex(
          (item) => item.id === Number(action.payload)
        ),
        1
      );
    },
    //sales categories---------------------------------------------------------------------
    setSalesCategories: (state, action) =>
      (state = { ...state, salesCategories: action.payload }),
    addSalesCategory: (state, action) =>
      (state = {
        ...state,
        salesCategories: [...state.salesCategories, action.payload],
      }),
    updateSalesCategory: (state, action) => {
      const element = state.salesCategories.findIndex(
        (item) => item.id === action.payload.id
      );
      state.salesCategories.splice(element, 1, action.payload);
    },
    updateSalesCategoryAfterDelete: (state, action) => {
      state.salesCategories.splice(
        state.salesCategories.findIndex(
          (item) => item.id === Number(action.payload)
        ),
        1
      );
    },
    //User by business---------------------------------------------------------------------------
    setBusinessUsers: (state, action) =>
      (state = { ...state, businessUsers: action.payload }),
    //roles--------------------------------------------------------------------------------------------
    setRoles: (state, action) => (state = { ...state, roles: action.payload }),
    //Person Categories---------------------------------------------------------------------------
    setPersonCategories: (state, action) =>
      (state = { ...state, personCategories: action.payload }),
    //Person Posts---------------------------------------------------------------------------
    setPersonPost: (state, action) =>
      (state = { ...state, personPosts: action.payload }),
    //ElToque Rates---------------------------------------------------------------------------
    setElToqueRates: (state, action) =>
      (state = { ...state, elToqueRates: action.payload }),
    setTitlesForExport: (state, action) => ({
      ...state,
      titlesForExport: action.payload,
    }),
    //Fixed Costs Categories ----------------------------------------------------------
    addFixedCosts: (state, action) =>
      (state = {
        ...state,
        fixedCostCategories: [...state.fixedCostCategories, action.payload],
      }),
    updateFixedCosts: (state, action) => {
      const element = state.fixedCostCategories.findIndex(
        (item) => item.id === action.payload.id
      );
      state.fixedCostCategories.splice(element, 1, action.payload);
    },
    updateFixedCostsAfterDelete: (state, action) => {
      state.fixedCostCategories.splice(
        state.fixedCostCategories.findIndex(
          (item) => item.id === Number(action.payload)
        ),
        1
      );
    },
  },
  extraReducers: (builder) =>
    builder.addMatcher(
      isAnyOf(initSystem, changeBusiness.fulfilled),
      (state, action) => {
        return {
          fixedCostCategories:action.payload.fixedCostCategories,
          areas: action.payload.areas,
          measures: action.payload.measures,
          productCategories: action.payload.productCategories,
          salesCategories: action.payload.salesCategories,
          businessUsers: action.payload.businessUsers,
          roles: action.payload.roles,
          product_attributes: action.payload.product_attributes,
          paymentWays: action.payload.paymentWays,
          personCategories: action.payload.personCategories,
          personPosts: action.payload.personPosts,
          elToqueRates: action.payload.elToqueRates,
          titlesForExport: action.payload.titlesForExport,
        };
      }
    ),
});

export const {
  addProductCategory,
  addSalesCategory,
  setBusinessUsers,
  setMeasures,
  setProductCategories,
  setRoles,
  setSalesCategories,
  setElToqueRates,
  updateAreaAfterDelete,
  updateAreas,
  updateCurrentArea,
  updateProductCategory,
  updateProductCategoryAfterDelete,
  updateSalesCategory,
  updateSalesCategoryAfterDelete,
  setPersonCategories,
  setPersonPost,
  setTitlesForExport,
  addFixedCosts,
  updateFixedCosts,
  updateFixedCostsAfterDelete
} = nomenclatorSlice.actions;
export default nomenclatorSlice.reducer;
