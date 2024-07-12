import React, { useState, createContext } from "react";
import StepsComponent from "../../../components/misc/StepsComponent";
import { useForm, SubmitHandler, Control } from "react-hook-form";
import Fetching from "../../../components/misc/Fetching";
import DetailsResource from "./DetailsResource";
import ResourceImg from "./ProductResource";
import { Resource } from "../../../interfaces/Interfaces";
import { useAppSelector } from "../../../store/hooks";

interface WizardInterface {
  action: Function;
  closeModal: Function;
  loading: boolean;
  fetching: boolean;
  mode: "new" | "edit";
  data?: Resource | null;
  secondAction?: Function;
}

interface ContextData {
  control?: Control;
  stepUp?: Function;
  stepDown?: Function;
  watch: Function;
  fetching?: boolean;
  mode?: "new" | "edit";
  data?: Resource | null;
  secondAction?: Function;
  closeModal?: Function;
  unregister?: Function;
}

const contextData: ContextData = { watch: () => {} };

export const ResourceContext = createContext(contextData);

const NewWizardResource = ({
  action,
  closeModal,
  loading,
  fetching,
  mode,
  data,
  secondAction,
}: WizardInterface) => {
  const { control, handleSubmit, reset, watch, unregister } =
    useForm<Record<string, string | number>>();

  //Step Component Data-------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(0);
  const stepTitles = ["Detalles del recurso", "Imagen"];

  const stepUp = () => setCurrentStep(currentStep + 1);
  const stepDown = () => {
    setCurrentStep(currentStep - 1);
  };
  //----------------------------------------------------------------------------------------

  //Form Handle -----------------------------------------------------------------------------
  const onSubmit: SubmitHandler<Record<string, string | number>> = (
    dataFrom
  ) => {
    const { areaId } = dataFrom;
    const id = mode === "edit" ? data?.id : areaId;
    const body = {
      code: dataFrom.code,
      numberAdults: dataFrom.numberAdults,
      numberKids: dataFrom.numberKids,
      isAvailable: dataFrom.isAvailable,
      isReservable: dataFrom.isReservable,
      description: dataFrom.description,
      numberClients:
        Number(dataFrom.numberKids) || 0 + Number(dataFrom.numberAdults) || 0,
    };
    currentStep !== 1 ? stepUp() : action(body, id, closeModal);
  };

  
  //-----------------------------------------------------------------------------------------

  return (
    <>
      <StepsComponent current={currentStep} titles={stepTitles} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <ResourceContext.Provider
          value={{
            control,
            stepUp,
            stepDown,
            watch,
            fetching,
            mode,
            data,
            secondAction,
            closeModal,
            unregister,
          }}
        >
          {loading && <Fetching />}
          {currentStep === 0 && <DetailsResource />}
          {currentStep === 1 && <ResourceImg />}
        </ResourceContext.Provider>
      </form>
    </>
  );
};

export default NewWizardResource;
