import React, { useState, createContext } from "react";
import StepsComponent from "../../../components/misc/StepsComponent";
import { useForm, SubmitHandler, Control } from "react-hook-form";
import ProductForm from "./ProductForm";
import Fetching from "../../../components/misc/Fetching";
import ProductTypeSelector from "./ProductTypeSelector";
import ProductImg from "./ProductImg";

interface WizardInterface {
  action: Function;
  closeModal: Function;
  loading: boolean;
}

interface ContextData {
  control?: Control;
  stepUp?: Function;
  stepDown?: Function;
  watch: Function;
  unregister: Function;
}

const contextData: ContextData = { watch: () => {}, unregister: () => {} };

export const ProductContext = createContext(contextData);

const NewWizardContainer = ({
  action,
  closeModal,
  loading,
}: WizardInterface) => {
  const { control, handleSubmit, reset, watch, unregister } =
    useForm<Record<string, string | number>>();

  //Step Component Data-------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(0);
  const stepTitles = ["Tipo de Producto", "Detalles del Producto", "Imagen"];

  const stepUp = () => setCurrentStep(currentStep + 1);
  const stepDown = () => {
    setCurrentStep(currentStep - 1);
  };
  //----------------------------------------------------------------------------------------

  //Form Handle -----------------------------------------------------------------------------
  const onSubmit: SubmitHandler<Record<string, string | number>> = (data) => {
    if (currentStep !== 2) {
      stepUp();
    } else {
      action(data, closeModal);
    }
  };

  //-----------------------------------------------------------------------------------------

  return (
    <>
      <StepsComponent current={currentStep} titles={stepTitles} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <ProductContext.Provider
          value={{ control, stepUp, stepDown, watch, unregister }}
        >
          {loading && <Fetching />}
          {currentStep === 0 && <ProductTypeSelector />}
          {currentStep === 1 && <ProductForm />}
          {currentStep === 2 && <ProductImg />}
        </ProductContext.Provider>
      </form>
    </>
  );
};

export default NewWizardContainer;
