import React, { useState, createContext } from "react";
import StepsComponent from "../../../../components/misc/StepsComponent";
import { useForm, SubmitHandler, Control } from "react-hook-form";
import Fetching from "../../../../components/misc/Fetching";

import CouponTypeSelector from "./CouponTypeSelector";
import CouponForm from "./CouponForm";

interface WizardInterface {
    action: Function,
    closeModal: Function,
    loading: boolean
}

interface ContextData {
    control?: Control;
    stepUp?: Function;
    stepDown?: Function;
}

const contextData: ContextData = {};

export const CouponContext = createContext(contextData);

const NewWizardContainer = ({ action, closeModal, loading }: WizardInterface) => {
    const { control, handleSubmit, reset } =
        useForm<Record<string, string | number>>();


    //Step Component Data-------------------------------------------------------------
    const [currentStep, setCurrentStep] = useState(0);
    const stepTitles = [
        "Tipo de Cupón",
        "Detalles del Cupón"
    ];

    const stepUp = () => setCurrentStep(currentStep + 1);
    const stepDown = () => {
        setCurrentStep(currentStep - 1)
    };
    //----------------------------------------------------------------------------------------


    //Form Handle -----------------------------------------------------------------------------
    const onSubmit: SubmitHandler<Record<string, string | number>> = (data) => {
        currentStep !== 1 ? stepUp() : action(data, closeModal)
    };

    //-----------------------------------------------------------------------------------------

    return (
        <>
            <StepsComponent current={currentStep} titles={stepTitles} />
            <form onSubmit={handleSubmit(onSubmit)}>
                <CouponContext.Provider value={{ control, stepUp, stepDown }}>
                    {loading && <Fetching />}
                    {currentStep === 0 && <CouponTypeSelector />}
                    {currentStep === 1 && <CouponForm />}
                </CouponContext.Provider>
            </form>
        </>
    );
};

export default NewWizardContainer;
