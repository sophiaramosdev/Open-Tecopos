import { useState, createContext } from "react";
import StepsComponent from "../../../../components/misc/StepsComponent";
import {
  useForm,
  SubmitHandler,
  Control,
  UseFormWatch,
  UseFormTrigger,
  UseFormUnregister,
} from "react-hook-form";
import DetailPersonComponent from "./Details";
import Post from "./Post";
import Fetching from "../../../../components/misc/Fetching";
import { cleanObj } from "../../../../utils/helpers";
import Address from "./Address";
import { toast } from "react-toastify";

interface UserWizzardInterface {
  addPerson: Function;
  isFetching: boolean;
  closeModal: Function;
}

interface UserCtxInterface {
  control: Control;
  watch: UseFormWatch<Record<string, string | number | boolean | string[]>>;
  trigger: UseFormTrigger<Record<string, string | number | boolean | string[]>>;
  unregister: UseFormUnregister<
    Record<string, string | number | boolean | string[]>
  >;
  nextStep: Function;
  beforeStep: Function;
  isFetching: boolean;
}

export const AddPersonCtx = createContext<Partial<UserCtxInterface>>({});

const NewUserWizzard = ({
  addPerson,
  isFetching,
  closeModal,
}: UserWizzardInterface) => {
  const { control, handleSubmit, watch, trigger, unregister } = useForm({
    mode: "onTouched",
  });
  const [currentStep, setCurrentStep] = useState(0);
  const stepsTitles = ["Detalles", "Dirección", "Negocio"];

  //Context for addUserForm ------------------------------------------------------------------------------
  const ctxData: UserCtxInterface = {
    control,
    watch,
    trigger,
    unregister,
    nextStep: () => setCurrentStep(currentStep + 1),
    beforeStep: () => setCurrentStep(currentStep - 1),
    isFetching,
  };

  //------------------------------------------------------------------------------------------------------

  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean | string[]>
  > = (data) => {
    const { createNewUser, address } = data;
    // if (!createNewUser) {
    //   toast.error(
    //     "Debe asociar un usuario. Cree uno nuevo o asigne uno existente"
    //   );
    //   return;
    // }
    if (createNewUser === undefined) {
      toast.error("Seleccione si crear, asignar o no crear usuario.")
    } else {
      data.createNewUser = createNewUser === "true";
      data.address = cleanObj(address);
      addPerson(cleanObj(data), closeModal);
    }

  };

  return (
    <div className="h-full">
      {isFetching && <Fetching />}
      <StepsComponent current={currentStep} titles={stepsTitles} />
      <AddPersonCtx.Provider value={ctxData}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {currentStep === 0 && <DetailPersonComponent />}
          {currentStep === 1 && <Address />}
          {currentStep === 2 && <Post />}
        </form>
      </AddPersonCtx.Provider>
    </div>
  );
};

export default NewUserWizzard;
