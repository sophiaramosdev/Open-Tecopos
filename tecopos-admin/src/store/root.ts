import {
  configureStore,
  ThunkAction,
  Action,
  combineReducers,
} from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import nomenclatorSlice from "./slices/nomenclatorSlice";
import sessionSlice from "./slices/sessionSlice";
import auxiliarSlice from "./slices/auxiliarSlice";
import initSlice from "./slices/initSlice";
import couponRestrictions from "./couponRestrictions";

const persistConfig = { key: "root", storage, whitelist: ["session"] };

const rootReducer = combineReducers({
  session: sessionSlice,
  init: initSlice,
  nomenclator: nomenclatorSlice,
  auxiliar: auxiliarSlice,
  coupons: couponRestrictions
});
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  middleware: (getDefaultMiddelware) =>
    getDefaultMiddelware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  reducer: persistedReducer,
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
