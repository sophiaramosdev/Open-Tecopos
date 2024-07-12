import { useState, useContext, createContext } from "react";
import SendList from "./SendList";
import ReceivedList from "./ReceivedList";
import { StockAreaProducts } from "../../../../../interfaces/ServerInterfaces";
import SpinnerLoading from "../../../../../components/misc/SpinnerLoading";
import EmptyList from "../../../../../components/misc/EmptyList";
import { ChevronDoubleRight } from "heroicons-react";
import Button from "../../../../../components/misc/Button";
import SearchComponent from "../../../../../components/misc/SearchComponent";
import {
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayUpdate,
  useFieldArray,
} from "react-hook-form";
import { DispatchContext } from "./DispatchWizard";

interface ProductMovement {
  stockProducts: StockAreaProducts[];
  loading: boolean;
}

export interface VisualData {
  id: number;
  quantity?: number;
  available: number;
  name: string;
  measure: string;
  variations: {
    id: number;
    name: string;
    available: number;
    quantity?: number;
  }[];
}

export interface FieldProductData {
  stockAreaProductId: number;
  productName: string;
  quantity?: number;
  measure: string;
  available: number;
  variationId?: number;
  variationName?: string;
}

interface ProductDispatchInterface {
  fields: Record<"id" | string, any>[];
  append: UseFieldArrayAppend<Record<string, any>, "products">;
  update: UseFieldArrayUpdate<Record<string, any>, "products">;
  remove: UseFieldArrayRemove;
  products: VisualData[];
}

export const DispatchProductContext = createContext<
  Partial<ProductDispatchInterface>
>({});

const ProductMovementStep = ({ stockProducts, loading }: ProductMovement) => {
  const { control, setCurrentStep, watch } = useContext(DispatchContext);
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "products",
  });

  //Data for Product List to Select ----------------------------------------------------------------
  const [filter, setFilter] = useState<string | null>(null);
  const products: VisualData[] = stockProducts
    .filter(
      (elem) =>
        !!elem.product.name
          .toLocaleLowerCase()
          .includes((filter ?? "").toLocaleLowerCase())
    )
    .map((item) => ({
      id: item.id,
      name: item.product.name,
      measure: item.product.measure,
      available: item.quantity,
      variations: item?.variations?.map((itm) => ({
        id: itm.variationId,
        name: itm.variation.name,
        available: itm.quantity,
      })),
    }));
  //----------------------------------------------------------------------------------------------

  const originArea = watch!("originAreaName");
  const destinationArea = watch!("destinationAreaName");

  if (loading)
    return (
      <div className="h-96">
        <SpinnerLoading />
      </div>
    );
  return (
    <DispatchProductContext.Provider
      value={{ append, fields, remove, update, products }}
    >
      <div className="grid grid-cols-11 gap-2">
        <div className="p-2 w-full col-span-11 rounded shadow-sm">
          <SearchComponent
            findAction={(find: string | null) => setFilter(find)}
            placeholder="Buscar Producto"
          />
        </div>
        <div className="relative h-96 border border-slate-300 p-3 rounded-md overflow-y-auto scrollbar-thin col-span-5 justify-center">
          <span>{}</span>
          <SendList />
        </div>
        <div className="flex flex-col col-span-1 items-center justify-center gap-3">
          <div className="py-1 px-2 bg-slate-50 border border-slate-100 rounded-md text-xs text-center shadow-sm">
            <p className="font-semibold underline">Desde:</p> {originArea}
          </div>
          <div className="flex border w-14 h-14 justify-center">
            <ChevronDoubleRight className="h-14 text-slate-500" />
          </div>
          <div className=" py-1 px-2 bg-slate-50 border border-slate-100 rounded-md text-xs text-center shadow-sm">
          <p className="font-semibold underline">Hacia:</p> {destinationArea}
          </div>
        </div>
        <div className="h-96 border border-slate-300 p-3 rounded-md overflow-y-auto scrollbar-thin col-span-5">
          {fields.length === 0 ? (
            <div className="h-full flex justify-center items-center">
              <EmptyList />
            </div>
          ) : (
            <ReceivedList />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 py-2 gap-2">
        <Button
          name="Atrás"
          color="gray-900"
          action={() => setCurrentStep!(0)}
          textColor="slate-800"
          full
          outline
        />
        <Button
          name="Siguiente"
          color="slate-600"
          disabled={fields.length === 0}
          action={() => setCurrentStep!(2)}
        />
      </div>
    </DispatchProductContext.Provider>
  );
};

export default ProductMovementStep;
