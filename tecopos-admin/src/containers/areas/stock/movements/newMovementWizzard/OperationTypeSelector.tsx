import { useContext } from "react";
import { RadioGroup } from "@headlessui/react";
import {
  getOperationIcon,
  getColorOperationType,
} from "../../../../../utils/stylesHelpers";
import { MovementsContext } from "./WizzardContainer";


function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface OptionModalInterface {
  name: string;
  description: string;
  code: string;
  color: string;
}

const optionsModal: OptionModalInterface[] = [
  {
    name: "Entrada",
    description: "Registro de productos luego de realizada una compra",
    code: "ENTRY",
    color: "border-emerald-500 ring-2 ring-emerald-500",
  },
  {
    name: "Traslado",
    description: "Movimiento entre áreas de almacén.",
    code: "MOVEMENT",
    color: "border-blue-500 ring-2 ring-blue-500",
  },
  {
    name: "Salida",
    description: "Son eliminaciones del inventario",
    code: "OUT",
    color: "border-orange-500 ring-2 ring-orange-500",
  },
  {
    name: "Ajuste",
    description: "Conciliación de inventario",
    code: "ADJUST",
    color: "border-yellow-300 ring-2 ring-yellow-300",
  },
 {
    name: "Transformación",
    description: "Convertir un producto en otro",
    code: "TRANSFORMATION",
    color: "border-slate-300 ring-2 ring-slate-300",
  },
  {
    name: "Merma",
    description: "Convertir un producto en otro",
    code: "WASTE",
    color: "border-red-300 ring-2 ring-red-300",
  },
];

const Icon =  ({code}:{code:string}) => {
  const Icon = getOperationIcon(code);
  return <Icon className="mr-5 align-middle text-slate-500 bg-transparent" />
}

const OperationTypeSelector = () => {
  const {watch, setValue, setCurrentStep} = useContext(MovementsContext);
  const selected = watch!("movementType");
  const onChange = (data:string) =>{
    setValue!("movementType", data);    
  }

 return (
    <>
      <div className="mt-3sm:mt-5 mt-5">
        <div className="mt-2 w-full">
          <RadioGroup
            value={selected}
            onChange={onChange}
            onClick={()=>setCurrentStep!(1)}
          >
            <RadioGroup.Label className="sr-only">
              {" "}
              Server size{" "}
            </RadioGroup.Label>
            <div className="space-y-4">
              {optionsModal.map((option) => (
                <RadioGroup.Option
                  key={option.name}
                  value={option.code}
                  className={({ checked, active }) =>
                    classNames(
                      checked ? "border-transparent" : "border-gray-300",
                      active || selected === option.code ? option.color : "",
                      "relative block w-full cursor-pointer rounded-lg border bg-white px-6 py-4 shadow-sm focus:outline-none sm:flex sm:justify-between"
                    )
                  }
                >
                  {({ active, checked }) => (
                    <div className="flex flex-row justify-center items-center">
                      {<Icon code={option.code} />}
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
                            active || selected === option.code
                              ? "border"
                              : "border-2",
                            checked
                              ? getColorOperationType(selected)
                              : "border-transparent",
                            "pointer-events-none absolute -inset-px rounded-lg bg-transparent"
                          )}
                          aria-hidden="true"
                        />
                      </>
                    </div>
                  )}
                </RadioGroup.Option>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>
    </>
  );
};

export default OperationTypeSelector;
