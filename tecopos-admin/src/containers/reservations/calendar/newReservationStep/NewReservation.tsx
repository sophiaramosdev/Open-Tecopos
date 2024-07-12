import StepsComponent from "../../../../components/misc/StepsComponent";
import React, { useContext, useEffect, useState } from "react";
import {
  SubmitHandler,
  useForm,
  Control,
  UseFormTrigger,
  UseFormSetValue,
  useFieldArray,
} from "react-hook-form";
import SelectServiceForm from "./SelectServiceForm";
import { createContext } from "react";
import BillingReservation from "./BillingReservation";
import { Product } from "../../../../interfaces/Interfaces";
import { toast } from "react-toastify";
import useServerProduct from "../../../../api/useServerProducts";
import Modal from "../../../../components/misc/GenericModal";
import NewClientV2 from "./NewClientV2";
import AddReservation from "./servicesModals/AddReservation";
import { ReservationsContext } from "../CalendarReservation";

interface NewReservationInterface {
  control: Control;
  watch: Function;
  trigger: UseFormTrigger<Record<string, any>>;
  setValue: UseFormSetValue<Record<string, any>>;
  setCurrentStep: Function;
  append: Function;
  remove: Function;
  fields: { id: string }[];
  isFetching: boolean;
  isLoading: boolean;
  services: Product[];
  setServices: Function;
  allProducts: Product[];
  isFetchingProduct: boolean;
  chekcAvailability: Function;
  setShowNewClient: Function;
  setAddModal: Function;
  isAvailability: boolean;
  isChecking: boolean;
  changeAvailability: boolean;
}
interface Props {
  close: Function;
  newReservation: Function;
  context: React.Context<any>;
}
export const NewReservationContext = createContext<
  Partial<NewReservationInterface>
>({});

const NewReservation = ({ close, newReservation,context }: Props) => {
  const {
    handleSubmit,
    control,
    unregister,
    watch,
    trigger,
    setValue,
    formState,
  } = useForm({ mode: "onChange" });
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [services, setServices] = useState<Product[]>([]);

  const {
    getAllProducts,
    allProducts,
    outLoading: isFetchingProduct,
  } = useServerProduct();

  useEffect(() => {
    getAllProducts({
      all_data: true,
      type: "SERVICE",
      availableForReservation: true,
    });
  }, []);

  const { isFetching, isLoading, chekcAvailability, isAvailability ,isChecking} =
    useContext(context);

  const stepsData: string[] = [
    "Seleccione servicio",
    // "Detalles de la reserva",
    "Facturación",
  ];

  const { append, remove, fields } = useFieldArray<any>({
    name: "reservationProducts",
    control,
  });

  const onSubmit: SubmitHandler<Record<string, any>> = async (data: any) => {
    if (fields.length === 0) {
      return toast.warn("Seleccione al menos un servicio a reservar ");
    }
    if (currentStep < 1) return setCurrentStep(currentStep + 1);
    newReservation(data, close);
  };
  const [showNewClient, setShowNewClient] = useState(false);
  const [addModal, setAddModal] = useState(false);
  return (
    <>
      <StepsComponent current={currentStep} titles={stepsData} />
      <NewReservationContext.Provider
        value={{
          control,
          watch,
          setValue,
          setCurrentStep,
          trigger,
          append,
          remove,
          fields,
          isFetching,
          isLoading,
          services,
          setServices,
          //@ts-ignore
          allProducts,
          isFetchingProduct,
          chekcAvailability,
          isAvailability,
          setShowNewClient,
          setAddModal,
          isChecking
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 ">
          {currentStep === 0 && <SelectServiceForm />}
          {currentStep === 1 && <BillingReservation />}
        </form>
        {addModal && (
          <Modal state={addModal} close={setAddModal} size="l">
            <AddReservation close={() => setAddModal(false)} defaultData={{}} />
          </Modal>
        )}
        {showNewClient && (
          <Modal
            close={() => setShowNewClient(false)}
            state={showNewClient}
            size="m"
          >
            <NewClientV2 close={() => setShowNewClient(false)} />
          </Modal>
        )}
      </NewReservationContext.Provider>
    </>
  );
};

export default NewReservation;
