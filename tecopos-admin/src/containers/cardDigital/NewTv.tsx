import { useState, createContext, useContext } from "react";
import {
  useForm,
  SubmitHandler,
  useFieldArray,
  Control,
  UseFormWatch,
  UseFormTrigger,
  UseFormClearErrors,
} from "react-hook-form";
import StepsComponent from "../../components/misc/StepsComponent";
import SelectTemplate from "./newTvSteps/SelectTemplate";
import DetailsTV from "./newTvSteps/DetailsTV";
import { CartDigitalContext } from "./CartDigital";
import { toast } from "react-toastify";

interface NewTv {
  control: Control;
  watch: UseFormWatch<Record<string, string | boolean | number | string[]>>;
  trigger: UseFormTrigger<Record<string, string | boolean | number | string[]>>;
  nextStep: Function;
  beforeStep: Function;
  getValues: Function;
  setValue: Function;
  clearErrors: UseFormClearErrors<Record<string, any>>;
  errors:any
}

interface WizzardInterface {
  closeModal: Function;
}

export const NewTvContext = createContext<Partial<NewTv>>({});

const NewTv = ({ closeModal }: WizzardInterface) => {
  const {
    control,
    handleSubmit,
    watch,
    trigger,
    getValues,
    clearErrors,
    setValue,
    formState: { errors },
  } = useForm();
  const { isFetching, newTv } = useContext(CartDigitalContext);
  const [currentStep, setCurrentStep] = useState(0);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    data.sequenceId = 1;
    
    newTv!(data, closeModal);
  };

  return (
    <>
      <StepsComponent current={currentStep} titles={["Plantilla", "Detalles"]} />
      <NewTvContext.Provider
        value={{
          nextStep: () => setCurrentStep(currentStep + 1),
          beforeStep: () => setCurrentStep(currentStep - 1),
          control,
          watch,
          setValue,
          errors
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="">
          {currentStep === 0 && <SelectTemplate />}
          {currentStep === 1 && <DetailsTV />}
          {/* {currentStep === 1 && <PagesContainer />} */}
        </form>
      </NewTvContext.Provider>
    </>
  );
};

export default NewTv;
