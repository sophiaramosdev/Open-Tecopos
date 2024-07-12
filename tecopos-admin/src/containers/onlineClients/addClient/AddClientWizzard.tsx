import { useState, createContext } from "react";
import {
  useForm,
  SubmitHandler,
  useFieldArray,
  Control,
  UseFormWatch,
  UseFormTrigger,
  UseFormClearErrors,
} from "react-hook-form";
import Fetching from "../../../components/misc/Fetching";
import { cleanObj } from "../../../utils/helpers";
import Input from "../../../components/forms/Input";
import StepsComponent from "../../../components/misc/StepsComponent";
import OnlinePersonalData from "./OnlinePersonalData";
import OnlineAddressData from "./OnlineAddressData";
import PhonesData from "./PhonesData";


interface AddClientInterface {
  control: Control;
  watch: UseFormWatch<Record<string, string | boolean | number | string[]>>;
  trigger: UseFormTrigger<Record<string, string | boolean | number | string[]>>;
  nextStep: Function;
  beforeStep: Function;
  getValues: Function;
  clearErrors: UseFormClearErrors<Record<string, any>>;
}

interface WizzardInterface {
  addClient: Function;
  isFetching: boolean;
  closeModal: Function;
}

export const AddClientCtx = createContext<Partial<AddClientInterface>>({});

const AddClientWizzard = ({
  addClient,
  isFetching,
  closeModal,
}: WizzardInterface) => {
  const { control, handleSubmit, watch, trigger, getValues ,clearErrors} = useForm();

  const [currentStep, setCurrentStep] = useState(0);
  const nextStep = () => setCurrentStep(currentStep + 1);
  const beforeStep = () => setCurrentStep(currentStep - 1);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    data.address = cleanObj(data.address);
    
    addClient(cleanObj(data), closeModal);
  };

  if (isFetching)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );
  return (
    <>
      <StepsComponent
        current={currentStep}
        titles={["Datos personales", "Dirección", "Teléfonos"]}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <AddClientCtx.Provider
          value={{ control, watch, trigger, nextStep, beforeStep, getValues,clearErrors }}
        >
          {currentStep === 0 && <OnlinePersonalData />}
          {currentStep === 1 && <OnlineAddressData />}
          {currentStep === 2 && <PhonesData />}
        </AddClientCtx.Provider>
      </form>
    </>
  );
};

export default AddClientWizzard;
