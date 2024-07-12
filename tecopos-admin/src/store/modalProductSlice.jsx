import { createSlice } from "@reduxjs/toolkit";
import {
  defaultContentModalProducts,
  contentModalReadyForSale,
  stepsNewProduct,
} from "../utils/dummy";

const initialState = {
  show: false,
  activeStepModal: "",
  avaliableForModal: "",
  contentModal: [],
  onFocus: null,
  actualCode: null,
  titleColor: { color: "", name: "" },
  steps: stepsNewProduct,
  actualSteps: [],
  countSteps: 1,
  stockTypeForMultiple: "",
  areas: [],
  licence: "",
};

export const modalProductSlice = createSlice({
  name: "modalProductSlice",
  initialState,
  reducers: {
    //migrado
    setAreas: (state, action) => {
      state.areas = action.payload;
    },
    //migrado
    setLicence: (state, action) => {
      state.licence = action.payload;
    },
    handleCountSteps: (state, action) => {
      if (action.payload === undefined)
        state.countSteps = initialState.countSteps;
      else {
        if (action.payload === "add") state.countSteps = state.countSteps + 1;
        if (action.payload === "sub") state.countSteps = state.countSteps - 1;
      }
    },
    handleNextStepsForm: (state) => {
      const stepsTemp = [...state.actualSteps];
      const index = (item) => item.status === "current";
      const indexStep = stepsTemp.findIndex(index);
      stepsTemp[indexStep] = {
        ...stepsTemp[indexStep],
        status: "complete",
      };
      stepsTemp[indexStep + 1] = {
        ...stepsTemp[indexStep + 1],
        status: "current",
      };
      state.actualSteps = stepsTemp;
    },
    handlePrevStepsForm: (state) => {
      const stepsTemp = [...state.actualSteps];
      const index = (item) => item.status === "current";
      const indexStep = stepsTemp.findIndex(index);
      stepsTemp[indexStep] = {
        ...stepsTemp[indexStep],
        status: "upcoming",
      };
      stepsTemp[indexStep - 1] = {
        ...stepsTemp[indexStep - 1],
        status: "current",
      };
      state.actualSteps = stepsTemp;
    },
    modalActive: (state, action) => {
      if (state.licence === "FREE") {
        state.activeStepModal = "MENU";
        state.actualCode = "MENU";
        state.actualSteps = state.steps.slice(0, 3);
        state.stockTypeForMultiple = "READYFORSALE";
      } else {
        action.payload !== undefined
          ? (state.activeStepModal = action.payload)
          : (state.activeStepModal = initialState.activeStepModal);
        if (action.payload === "")
          defaultContentModalProducts.map((item) =>
            state.avaliableForModal.map(
              (aval) => item.code === aval && state.contentModal.push(item)
            )
          );
      }
    },
    showModalActive: (state, action) => {
      action.payload !== undefined
        ? (state.show = action.payload)
        : (state.show = !state.show);
    },
    setAvaliableForContent: (state, action) => {
      state.avaliableForModal = action.payload;
      
      if (state.activeStepModal === "") state.contentModal = [];
      defaultContentModalProducts.map((item) =>
        state.avaliableForModal.map(
          (aval) => item.code === aval && state.contentModal.push(item)
        )
      );
      
      if (state.activeStepModal === "READYFORSALE") {
        state.contentModal = [];
        contentModalReadyForSale.map((item) =>
          state.avaliableForModal.map(
            (aval) => item.code === aval && state.contentModal.push(item)
          )
        );
      }
    },

    handleOptionsProducts: (state, action) => {
      if (state.onFocus === action.payload.name) {
        state.onFocus = initialState.onFocus;
        state.actualCode = initialState.actualCode;
      } else {
        state.onFocus = action.payload.name;
        state.actualCode = action.payload.code;
      }
      state.titleColor = {
        color: action.payload.color,
        name: action.payload.name,
      };
      state.actualCode === "SERVICE" && state.areas.length !== 0
        ? state.licence !== "FREE" && (state.actualSteps = state.steps)
        : (state.actualSteps = state.steps.slice(0, 3));
      if (
        state.actualCode === "STOCK" ||
        state.actualCode === "COMBO" ||
        state.actualCode === "VARIATION"
      ) {
        state.actualSteps = state.steps.slice(0, 3);
      }
      if (state.actualCode === "MENU") {
        state.licence !== "FREE"
          ? (state.actualSteps = state.steps)
          : (state.actualSteps = state.steps.slice(0, 3));
      }
      if (
        state.actualCode === "RAW" ||
        state.actualCode === "MANUFACTURED" ||
        state.actualCode === "WASTE" ||
        state.actualCode === "ASSET"
      ) {
        state.actualSteps = state.steps.slice(0, 2);
      }
    },
    handleClosedModal: () => initialState,
    handleNext: (state) => {
      if (state.actualCode !== null) {
        state.activeStepModal = state.actualCode;
        if (state.activeStepModal === "READYFORSALE") {
          state.stockTypeForMultiple = state.activeStepModal;
          state.onFocus = initialState.onFocus;
          state.titleColor = initialState.titleColor;
        }
      }
    },
    handleBack: (state) => {
      state.stockTypeForMultiple = initialState.stockTypeForMultiple;
      state.titleColor = initialState.titleColor;
      state.activeStepModal = initialState.activeStepModal;
      state.onFocus = initialState.onFocus;
      state.actualCode = initialState.actualCode;
    },
    setOnFocus: (state, action) => {
      action.payload !== undefined
        ? (state.onFocus = action.payload)
        : (state.onFocus = initialState.onFocus);
    },
    setCodeProduct: (state, action) => {
      action.payload !== undefined
        ? (state.actualCode = action.payload)
        : (state.actualCode = initialState.actualCode);
    },
    setTitleColor: (state, action) => {
      action.payload !== undefined
        ? (state.titleColor = action.payload)
        : (state.titleColor = initialState.titleColor);
    },
    setActualStepsActive: (state, action) => {
      state.actualSteps = action.payload;
    },
  },
});
export const selectModalStates = (state) => state.modalProductSlice;
export const {
  setAreas,
  setLicence,
  modalActive,
  showModalActive,
  setAvaliableForContent,
  setOnFocus,
  setCodeProduct,
  setTitleColor,
  handleOptionsProducts,
  handleClosedModal,
  handleNext,
  handleBack,
  handleNextStepsForm,
  setActualStepsActive,
  handlePrevStepsForm,
  handleCountSteps,
} = modalProductSlice.actions;
export default modalProductSlice.reducer;
