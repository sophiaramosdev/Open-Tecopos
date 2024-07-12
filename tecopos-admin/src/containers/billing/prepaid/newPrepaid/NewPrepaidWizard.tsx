import React, { useContext, useState } from "react";
import StepsComponent from "../../../../components/misc/StepsComponent";
import { SubmitHandler, useForm } from "react-hook-form";
import { PaymentsPrepaidStep } from "./prepaidSteps/PaymentsPrepaidStep";
import Modal from "../../../../components/misc/GenericModal";
import { SuccessBillingModal } from "../../register/SuccessBillingModal";
import { useServerBilling } from "../../../../api/useServerBilling";
import { ClientDataStep } from "../../register/registers/ClientDataStep";
import { PrepaidContext } from "../AllPrepaidList";
import { RegisterContext } from "../../register/AllRegistersList";
import { ClientDataStepPrepaid } from "./prepaidSteps/ClientDataStepPrepaid";
interface Props {
  state: boolean;
  close: Function;
}
export const NewPrepaidWizard = ({ state, close }: Props) => {
  // Hooks
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    reset,
    getValues,
    clearErrors,
  } = useForm();
  // States
  const [currentStep, setCurrentStep] = useState<any>(0);
  //const {isFetching,setIsFetching } = useServerBilling()
 // const [isSubmit, setIsSubmit] = useState(false);

  const { setPrepaidsList, prepaidsList, addNewPrepaid,isFetching} =
    useContext(PrepaidContext);

  const stepsData: string[] = ["Datos del cliente", "Pago"];

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    const newPrepaid = {
      registeredPayments: {...data.registeredPayments,paymentWay:data.paymentWay},
      clientId: data.clientId,
      description: data.description,
      areaId: data.areaId,
      paymentDateClient: data.paymentDateClient,
      operationNumber: data.operationNumber,
      madeById:data.madeById
    };
    //@ts-ignore
    addNewPrepaid(newPrepaid, (data: any) =>{})
      .then(() => handleResetWhenClose())
  };

  const handleResetWhenClose = () => {
    setCurrentStep(() => {
      close();
      reset();
      return 0;
    });
  };
  return (
    <>
      <PrepaidContext.Provider
        value={{
          control,
          watch,
          setValue,
          setCurrentStep,
          trigger,
          reset,
          getValues,
          currentStep,
          isFetching,
          clearErrors,
        }}
      >
        <Modal state={state} close={() => handleResetWhenClose()} size="m">
          <StepsComponent titles={stepsData} current={currentStep} />
          <form onSubmit={handleSubmit(onSubmit)}>
            {currentStep === 0 && <ClientDataStepPrepaid />}
            {currentStep === 1 && <PaymentsPrepaidStep />}
          </form>
         
        </Modal>
      </PrepaidContext.Provider>
    </>
  );
};
