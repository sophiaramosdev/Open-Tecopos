import { useContext, useEffect } from 'react'
import { RadioGroup } from '@headlessui/react'
import { getColorRegisterBillingType, getRegisterBillingIcon } from '../../../../utils/stylesHelpers';
import useServerEcoCycle from '../../../../api/useServerEconomicCycle';
import Fetching from '../../../../components/misc/Fetching';
import { RegisterContext } from '../AllRegistersList';
import useServer from '../../../../api/useServerMain';


function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}
interface OptionModalInterface {
    name: string;
    description: string;
    code: string;
    color: string;
}

export const RegisterTypeStep = () => {
    // hooks
    const { activeEcoCycles, getActiveEcoCycle, isFetching } = useServerEcoCycle()
    const { setCurrentStep, setValue, watch } = useContext(RegisterContext);
    
    const {allowRoles} = useServer();

    const verifyActiveEcoCycles = [];
    activeEcoCycles.forEach((ecoCycle) => {
      ecoCycle?.isActive && verifyActiveEcoCycles.push(ecoCycle);
    });
    const conditionToRenderBilling =
      verifyActiveEcoCycles.length > 0 &&
      !allowRoles(["MARKETING_SALES"], true);

    const selectedType = watch!('registerType')
    const onChange = (data: string) => {
        setValue!('registerType', data)
    }
    const Icon = ({ code }: { code: string }) => {
        const Icon = getRegisterBillingIcon(code)
        return <Icon className="mr-5 align-middle text-slate-500 bg-transparent" />
    }

    const optionsModal: OptionModalInterface[] = [

        {
            name: "Pre-Factura",
            description: "Al registrar una Pre-factura no se descontarán los productos del almacén",
            code: "PRE-BILLING",
            color: 'border-blue-500 ring ring-blue-500'
        },
    ]

    conditionToRenderBilling && optionsModal.unshift({
        name: "Factura",
        description: "Al registrar una factura se descontarán los productos del almacén",
        code: "BILLING",
        color: 'border-blue-500 ring ring-blue-500'
    },)


    useEffect(() => {
        getActiveEcoCycle()
    },[])


    return ( 
        <div className='min-h-[25rem]'>
            {
                isFetching 
                    ? 
                        <Fetching /> 
                    :
                    <RadioGroup
                    value={selectedType}
                    onChange={onChange}
                    //onClick={() => setCurrentStep!(1)}
                    onDoubleClick={() => setCurrentStep!(1)}
                    className={`select-none`}
                >
                    <RadioGroup.Label className="sr-only">
                        {" "}
                        Server size{" "}
                    </RadioGroup.Label>
                    <div className='space-y-4' >
                        {
                            optionsModal.map((option) => (
                                <RadioGroup.Option
                                    key={option.name}
                                    value={option.code}
                                    className={({ checked, active }) =>
                                        classNames(
                                            checked ? "border-transparent" : "border-gray-300",
                                            active || selectedType === option.code ? option.color : "",
                                            "relative block w-full cursor-pointer rounded-lg border bg-white px-6 py-4 shadow-sm focus:outline-none sm:flex "
                                        )
                                    }
                                >
                                    {({ checked, active }) => (
                                        <>
                                                {<Icon code={option.code} />}
                                            <div className="flex items-center justify-between">
                                                <>
                                                    <span className="flex items-center">
                                                        <span className="flex flex-col text-sm">
                                                            <RadioGroup.Label
                                                                as="span"
                                                                className="font-medium text-gray-900"
                                                            >
                                                                {option.name}
                                                            </RadioGroup.Label>
                                                            <RadioGroup.Description
                                                                as="span"
                                                                className="text-gray-500"
                                                            >
                                                                <span className="block sm:inline">
                                                                    {option.description}
                                                                </span>
                                                            </RadioGroup.Description>
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={classNames(
                                                            active || selectedType === option.code
                                                                ? "border"
                                                                : "border-2",
                                                            checked
                                                                ? selectedType &&getColorRegisterBillingType(selectedType)
                                                                : "border-transparent",
                                                            "pointer-events-none absolute -inset-px rounded-lg bg-transparent"
                                                        )}
                                                        aria-hidden="true"
                                                    />
                                                </>
                                            </div>
                                        </>
                                    )}
        
                                </RadioGroup.Option>
                            ))
                        }
                    </div>
        
                </RadioGroup>
            }
        </div>
    )
}
