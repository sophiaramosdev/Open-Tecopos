import { useState, useEffect, createContext } from "react";
import StepsComponent from "../../../../../components/misc/StepsComponent";
import AreasSelectorStep from "./AreasSelectorStep";
import NotesFinishStep from "./NotesFinishStep";
import ProductMovementStep from "./ProductMovementStep";
import useServerArea from "../../../../../api/useServerArea";
import Fetching from "../../../../../components/misc/Fetching";
import {
  Control,
  SubmitHandler,
  UseFormSetValue,
  UseFormTrigger,
  UseFormWatch,
  useForm,
} from "react-hook-form";
import { cleanObject, cleanObj } from "../../../../../utils/helpers";

interface WizardInterface {
  submitAction: Function;
  loading: boolean;
}

interface DispatchContextInterface {
  control: Control;
  watch: UseFormWatch<Record<string, any>>;
  trigger: UseFormTrigger<Record<string, any>>;
  setValue: UseFormSetValue<Record<string, any>>;
  setCurrentStep: Function;
}

export const DispatchContext = createContext<Partial<DispatchContextInterface>>(
  {}
);

const DispatchWizard = ({ submitAction, loading }: WizardInterface) => {
  const { getAreasToDispatch, allAreas, sharesAreas, isLoading } =
    useServerArea();
  const {
    stockProducts,
    getProductsByArea,
    isLoading: loadingProducts,
  } = useServerArea();
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    unregister,
  } = useForm();

  useEffect(() => {
    if (allAreas.length === 0 && sharesAreas.length === 0) getAreasToDispatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const stockId = watch("stockAreaFromId");
    if (stockId)
      getProductsByArea(stockId, {
        all_data: true,
      });
    unregister("products");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch("stockAreaFromId")]);

  //Manage Steps Component ------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(0);
  const stepsData: string[] = [
    "Origen / Destino",
    "Seleccionar productos",
    "Observaciones",
  ];
  //------------------------------------------------------------------------

  //Submit action -------------------------------------------------------------
  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    //Clean products object funtion--------------------------------------

    const products = data?.products?.map((item: Record<string, string>) =>
      cleanObject(item, [
        "id",
        "productName",
        "measure",
        "variationName",
        "available",
      ])
    );
    data.products = products;
    data = cleanObject(data, ["originAreaName", "destinationAreaName"]);
    data.mode = "MOVEMENT";
    //--------------------------------------------------------------------
    submitAction(cleanObj(data));
  };
  //---------------------------------------------------------------------------

  if (isLoading||loading) return <Fetching className="h-96" />;
  return (
    <>
      <StepsComponent titles={stepsData} current={currentStep} />
      <DispatchContext.Provider
        value={{ control, watch, setValue, setCurrentStep, trigger }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {currentStep === 0 && (
            <AreasSelectorStep allAreas={allAreas} sharesAreas={sharesAreas} />
          )}
          {currentStep === 1 && (
            <ProductMovementStep
              stockProducts={stockProducts}
              loading={loadingProducts}
            />
          )}
          {currentStep === 2 && <NotesFinishStep />}
        </form>
      </DispatchContext.Provider>
    </>
  );
};

export default DispatchWizard;
