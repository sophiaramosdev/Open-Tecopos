import { createSlice } from "@reduxjs/toolkit";

export const nomenclatorSlice = createSlice({
  name: "nomenclator",

  initialState: {
    productCategories: [],
    salesCategories: [],
    areas: [],
    measures: [],
  },

  reducers: {
    fetchStore: (state, action) => {
      state.productCategories = action.payload.productCategories;
      state.salesCategories = action.payload.salesCategories;
      state.areas = action.payload.areas;
      state.measures = action.payload.measures;
    },

    updateProductCategories: (state, action) => {
      state.productCategories = action.payload;
    },

    updateArea: (state, action) => {
      let nextAreas = state.areas.map((item) => {
        if (item.id === action.payload.id) {
          return action.payload;
        }

        return item;
      });

      state.areas = nextAreas;
    },

    newArea: (state, action) => {
      state.areas = [...state.areas, action.payload];
    },

    deleteArea: (state, action) => {
      state.areas = state.areas.filter((item) => item.id !== action.payload.id);
    },

    deleteCategory: (state, action) => {
      state.salesCategories.find(
        (item) =>
          item.id === action.payload &&
          state.salesCategories.splice(state.salesCategories(item, 1))
      );
    },
    updateSalesCategories: (state, action) => {
      return [...state.salesCategories, action.payload];
    },
  },
});

export const {
  fetchStore,
  updateProductCategories,
  updateSalesCategories,
  updateArea,
  newArea,
  deleteArea,
} = nomenclatorSlice.actions;

export const selectNomenclator = (state) => state.nomenclator;

export default nomenclatorSlice.reducer;
