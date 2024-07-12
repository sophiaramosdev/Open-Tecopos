import { createContext, useState, useEffect } from "react";
import {
  Control,
  SubmitHandler,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayUpdate,
  UseFormReset,
  UseFormSetValue,
  UseFormWatch,
  useFieldArray,
  useForm,
} from "react-hook-form";
import {
  InvoiceInterface,
  ProductInterface,
} from "../../../../../interfaces/ServerInterfaces";
import useServerProduct from "../../../../../api/useServerProducts";
import useServerArea from "../../../../../api/useServerArea";
import StepsComponent from "../../../../../components/misc/StepsComponent";
import OperationTypeSelector from "./OperationTypeSelector";
import SelectProductComponent from "./SelectProductComponent";
import { useParams } from "react-router";
import TransfComponent from "./TransfComponent";
import NotesComponent from "./NotesComponent";
import { cleanObj } from "../../../../../utils/helpers";

interface MovementContextInterface {
  currentStep: number;
  setCurrentStep: Function;
  products: ProductInterface[];
  watch: UseFormWatch<Record<string, any>>;
  setValue: UseFormSetValue<Record<string, any>>;
  reset: UseFormReset<Record<string, any>>;
  control: Control;
  loading: boolean;
  fetching: boolean;
  search: string | null;
  setSearch: Function;
  fields: Record<string, any>[];
  append: UseFieldArrayAppend<any, "products">;
  remove: UseFieldArrayRemove;
  update: UseFieldArrayUpdate<any, "products">;
}

export interface SelectedProduct {
  productId: number;
  quantity: number;
  supplierId?: number;
  variationId?: number;
  price?: InvoiceInterface;
}

export const MovementsContext = createContext<
  Partial<MovementContextInterface>
>({});

interface Wizzard {
  action: Function;
  loading: boolean;
}

const WizzardContainer = ({ action, loading }: Wizzard) => {
  const { handleSubmit, control, watch, setValue, reset } =
    useForm();
  const { append, fields, remove, update } = useFieldArray({
    name: "products",
    control,
  });
  const { getAllProducts, allProducts, outLoading } = useServerProduct();
  const { getProductsByArea, stockProducts, isLoading } = useServerArea();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [search, setSearch] = useState<string | null>(null);

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    //Clean products object funtion--------------------------------------
    const getFinalProduct = (product: Record<string, any>) => {
      const objToArray = Object.entries(product).filter(
        (itm) =>
          ![
            "id",
            "productName",
            "measure",
            "averageCost",
            "variationName",
            "baseProductMeasure",
            "baseProductName",
            "transformedProductName",
            "transformedProdudctMeasure",
            "stockQuantity",
            "stockVariations",
          ].includes(itm[0])
      );
      return Object.fromEntries(objToArray);
    };
    //--------------------------------------------------------------------
    const products = data.products.map((item: Record<string, string>) =>
      getFinalProduct(item)
    );
    data.products = products;
    const type = data.movementType;
    delete data.movementType;
    action(type, cleanObj(data));
  };

  const stepsData: string[] = [
    "Seleccionar Operación",
    "Buscar Productos",
    "Detalles",
  ];

  const movementType = watch("movementType");
  const { stockId } = useParams();

  useEffect(() => {
    if (!!movementType) {
      if (movementType !== "ENTRY") {
        getProductsByArea!(stockId, { all_data: true });
      } else {
        search &&
          getAllProducts!({
            type: "STOCK,RAW,MANUFACTURED,ASSET,VARIATION",
            search,
            all_data: true,
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementType, search]);

  const products: ProductInterface[] =
    movementType === "ENTRY"
      ? allProducts ?? []
      : stockProducts
        ?.filter((itm) =>
          itm.product.name
            .toLocaleLowerCase()
            .includes((search ?? "").toLocaleLowerCase())
        )
        .map((item) => ({
          ...item.product,
          stockVariations: item.variations,
          stockQuantity: item.quantity,
        })) ?? [];

  const contextValues: MovementContextInterface = {
    currentStep,
    setCurrentStep,
    control,
    products,
    setValue,
    watch,
    reset,
    loading: outLoading || isLoading,
    fetching: loading,
    search,
    setSearch,
    append,
    fields,
    remove,
    update,
  };

  return (
    <>
      <StepsComponent current={currentStep} titles={stepsData} />
      <MovementsContext.Provider value={contextValues}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {currentStep === 0 && <OperationTypeSelector />}
          {currentStep === 1 && movementType !== "TRANSFORMATION" && (
            <SelectProductComponent />
          )}
          {currentStep === 1 && movementType === "TRANSFORMATION" && (
            <TransfComponent />
          )}
          {currentStep === 2 && <NotesComponent />}
        </form>
      </MovementsContext.Provider>
    </>
  );
};

export default WizzardContainer;
