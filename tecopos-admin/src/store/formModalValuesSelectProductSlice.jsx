import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  description: "",
  areas: [],
  productCategoryId: "",
  salesCategoryId: "",
  measure: "UNIT",
  price: "",
  codeCurrency: "",
};

const modalSelectProductValues = createSlice({
  name: "modalSelectProductValues",
  initialState,
  reducers: {
    addAreas: (state, action) => {
      state.areas.push(action.payload);
    },
    removeAreas: (state, action) => {
      state.areas.find(
        (itemId) =>
          itemId === action.payload &&
          state.areas.splice(state.areas.indexOf(itemId), 1)
      );
    },
    setFormValues: (state, action) => (state = action.payload),
    resetForm: () => initialState,
  },
});
export const selectFormValues = (state) => state.modalSelectProductValues;
export const { resetForm, setFormValues, addValues, removeAreas, addAreas } =
  modalSelectProductValues.actions;
export default modalSelectProductValues.reducer;
