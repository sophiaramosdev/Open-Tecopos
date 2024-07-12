import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import APIServer from "../api/APIServices";

export const getAllMeasure = createAsyncThunk(
  "modalSelectProductValues/getAllMeasure",
  async () => {
    const res = await APIServer.get("/administration/measures").catch(
      (error) => {
        if (error) throw error;
      }
    );
    return res.data;
  }
);
export const productSlice = createSlice({
  name: "product",

  initialState: {
    product: null,
    productType: undefined, // {type: string, stockType: string}
    economicCSelected: null,
    allMeasure: [],
  },

  reducers: {
    setEconCicl: (state, action) => {
      state.economicCSelected = action.payload;
    },
    setProduct: (state, action) => {
      state.product = action.payload;
    },

    setProductType: (state, action) => {
      state.productType = action.payload;
    },

    updateProduct: (state, action) => {
      state.product = { ...state.product, ...action.payload };
    },
  },
  extraReducers: (builder) =>
    builder.addCase(getAllMeasure.fulfilled, (state, action) => {
      state.allMeasure = action.payload;
    }),
});

export const { setProduct, updateProduct, setProductType, setEconCicl } =
  productSlice.actions;

export const selectProduct = (state) => state.product;

export default productSlice.reducer;
