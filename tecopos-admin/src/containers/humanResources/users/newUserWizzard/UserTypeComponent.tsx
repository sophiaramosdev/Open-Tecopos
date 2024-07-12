import { useContext } from "react";
import { toast } from "react-toastify";
import { AddUserCtx } from "./NewUserWizzard";
import { getUserTypes } from "../../../../utils/stylesHelpers";
import InlineRadio, { InlineRadioData } from "../../../../components/forms/InlineRadio";
import RadioGroupForm from "../../../../components/forms/RadioGroup";
import Button from "../../../../components/misc/Button";

const UserTypeComponent = () => {
  const { control, nextStep, watch, trigger } = useContext(AddUserCtx);

  const data: InlineRadioData[] = [
    {
      label: "Dirección",
      value: "manager",
    },
    {
      label: "Trabajador",
      value: "worker",
    },
  ];
  const userTypes = getUserTypes("manager,worker")
  const defaultType = watch && watch("type")

  const nextAction = async() => {
    if(trigger && await trigger("type")){
      nextStep && nextStep();
  }else{
    toast.error("Debe seleccionar un tipo de usuario")
  }
}


  return (
    <>
      <div className="h-96 border border-slate-300 rounded p-2 pr-4 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
        <RadioGroupForm
          data={userTypes}
          name="type"
          control={control}
          action={nextAction}
        />
      </div>
    </>
  );
};

export default UserTypeComponent
