import { useState, createContext } from "react";
import UserTypeComponent from "./UserTypeComponent";
import StepsComponent from "../../../../components/misc/StepsComponent";
import { useForm, SubmitHandler, Control, UseFormWatch, UseFormTrigger, UseFormUnregister } from "react-hook-form";
import DetailUserComponent from "./DetailUserComponent";
import UserRolesComponent from "./UserRolesComponent";
import Fetching from "../../../../components/misc/Fetching";
import { cleanObj } from "../../../../utils/helpers";

interface UserWizzardInterface {
  addUser:Function,
  isFetching:boolean,
  closeModal:Function
}

interface UserCtxInterface {
  control: Control;
  watch: UseFormWatch<Record<string, string | number | boolean | string[]>>;
  trigger:UseFormTrigger<Record<string, string | number | boolean | string[]>>;
  unregister:UseFormUnregister<Record<string, string | number | boolean | string[]>>;
  nextStep: Function;
  beforeStep: Function;
  isFetching:boolean;
}

export const AddUserCtx = createContext<Partial<UserCtxInterface>>({});

const NewUserWizzard = ({addUser, isFetching, closeModal}:UserWizzardInterface) => {
  const { control, handleSubmit, watch, trigger, unregister} = useForm({
    mode:"onTouched"
  });
  const [currentStep, setCurrentStep] = useState(0);
  const stepsTitles = ["Tipo de usuario", "Detalles", "Roles"];

  //Context for addUserForm ------------------------------------------------------------------------------
  const ctxData: UserCtxInterface = {
    control,
    watch,
    trigger,
    unregister,
    nextStep: () => setCurrentStep(currentStep + 1),
    beforeStep: () => setCurrentStep(currentStep - 1),
    isFetching
  };


  //------------------------------------------------------------------------------------------------------

  const onSubmit: SubmitHandler<Record<string, string | number | boolean |string[]>> = (
    data
  ) => {
    delete data.type;
    addUser(cleanObj(data), closeModal);
  };

  return (
    <div className="h-full">
      {isFetching && <Fetching />}
      <StepsComponent current={currentStep} titles={stepsTitles} />
      <AddUserCtx.Provider value={ctxData}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {currentStep === 0 && <UserTypeComponent />}
          {currentStep === 1 && <DetailUserComponent />}    
          {currentStep === 2 && <UserRolesComponent />}       
        </form>
      </AddUserCtx.Provider>
    </div>
  );
};

export default NewUserWizzard;
