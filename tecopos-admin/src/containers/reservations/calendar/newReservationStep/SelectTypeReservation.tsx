import { useState } from "react";
import { RadioGroup } from "@headlessui/react";
import Button from "../../../../components/misc/Button";
import { useEffect } from "react";
import { Calendar } from "heroicons-react";
import { BsBlockquoteRight, BsLock } from "react-icons/bs";
import { IconType } from "react-icons";
import { IoCalendarSharp } from "react-icons/io5";

interface Prop {
  type?: string;
  setType: Function;
}
interface OptionModalInterface {
  name: string;
  description: string;
  code: string;
}
const SelectTypeReservation = ({ setType }: Prop) => {
  const Icon = ({ code }: { code: string }) => {
    const Icon = getIcon(code);
    return <Icon className=" mr-5  text-slate-500 bg-transparent" />;
  };

  const optionsModal: OptionModalInterface[] = [
    {
      name: "Nueva reserva",
      description:
        "Registrar nueva reserva: Ingrese fechas y complete los detalles requeridos.",
      code: "reservation",
    },
    {
      name: "Tiempo de Bloqueo",
      description:
        "Agregar nuevo bloqueo de tiempo: Seleccionar fecha y duración.",
      code: "block",
    },
  ];

  const [selected, setSelected] = useState(optionsModal[0].code);

  const handleSelect = () => {
    setType(selected);
  };

  return (
    <>
      <section className="h-[28rem]">
        <h1 className="font-semibold text-xl text-center mb-2 ">
          Añadir nuevo{" "}
        </h1>
        <RadioGroup
          value={selected}
          onChange={setSelected}
          className="flex flex-col gap-y-3 select-none"
          onClick={handleSelect}
        >
          <div className="space-y-2">
            {optionsModal.map((option) => (
              <RadioGroup.Option
                key={option.code}
                value={option.code}
                className={({ active, checked }) =>
                  `${
                    active ? "ring-2  ring-offset-2 ring-offset-indigo-700" : ""
                  }
                  ${"text-black"}
                    relative flex cursor-pointer rounded-lg px-5 py-4  focus:outline-none border`
                }
              >
                {({ active, checked }) => (
                  <>
                    {<Icon code={option.code} />}
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm">
                          <RadioGroup.Label as="p" className={`font-medium`}>
                            {option.name}
                          </RadioGroup.Label>
                          <RadioGroup.Description as="span">
                            {option.description}
                          </RadioGroup.Description>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
        {/* <footer className="grid grid-cols-3 gap-x-5 items-end justify-end  mt-[190px] ">
        <div></div>
        <div></div>
        // {/* <Button
        //   name="Siguiente"
        //   color="slate-700"
        //   type="submit"
        //   full
        //   action={handleSelect}
        // /> 
      </footer> */}
      </section>
    </>
  );
};

export default SelectTypeReservation;

const getIcon: (value: string) => IconType = (value) => {
  switch (value) {
    case "block":
      return BsLock;
    case "reservation":
      return IoCalendarSharp;
    default:
      return IoCalendarSharp;
  }
};
