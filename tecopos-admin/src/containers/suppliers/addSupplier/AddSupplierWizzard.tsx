import { useState, createContext, useEffect } from "react";
import { useForm, SubmitHandler, Control, UseFormWatch, UseFormTrigger } from "react-hook-form";
import Fetching from "../../../components/misc/Fetching";
import { cleanObj } from "../../../utils/helpers";
import StepsComponent from "../../../components/misc/StepsComponent";
import PersonalSupplier from "./PersonalSupplierData";
import AddressSupplierData from "./AddressSupplierData";
import PhonesSupplierData from "./PhonesSupplierData";
import { SupplierInterfaces } from '../../../interfaces/ServerInterfaces';

interface AddClientInterface{
  control:Control,
  setValue: Function;
  watch:UseFormWatch<Record<string,string|boolean|number|string[]>>,
  trigger:UseFormTrigger<Record<string,string|boolean|number|string[]>>,
  nextStep:Function,
  beforeStep:Function
}

interface WizzardInterface{
  allSuppliers: SupplierInterfaces[]
  addSupplier:Function,
  isFetching:boolean,
  closeModal:Function
}

export const AddSupplierCtx = createContext<Partial<AddClientInterface>>({});

const AddSupplierWizzard = ({addSupplier,isFetching, closeModal}:WizzardInterface) => {
  const { control, handleSubmit, watch, trigger, setValue } = useForm({mode:"onChange"}); 
  
  const [currentStep, setCurrentStep] = useState(0)
  const nextStep = () => setCurrentStep(currentStep+1)
  const beforeStep = () => setCurrentStep(currentStep-1);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean >> = (data) => {
    data.address = cleanObj(data.address);
    addSupplier(cleanObj(data), closeModal);
  };

  if (isFetching) return <div className="h-96"><Fetching /></div> ;
  return (
    <>
    <StepsComponent current={currentStep} titles={["Datos personales", "Dirección", "Teléfonos"]} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <AddSupplierCtx.Provider value={{control, watch, trigger, nextStep, beforeStep, setValue}} >
          {currentStep === 0 && <PersonalSupplier />} 
          {currentStep === 1 && <AddressSupplierData />}       
          {currentStep === 2 && <PhonesSupplierData />}
        </AddSupplierCtx.Provider>
      </form>
    </>
  );
};

export default AddSupplierWizzard;
