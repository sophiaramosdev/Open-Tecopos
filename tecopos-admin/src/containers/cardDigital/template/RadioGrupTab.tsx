import { useContext, useState } from "react";
import { RadioGroup } from "@headlessui/react";
import Button from "../../../components/misc/Button";
import { NewTvContext } from "../NewTv";

const plans = [
  {
    name: "Clásica carrusel de productos verticalc",
    duration: 3000,
    img: "/template.jpg",
    description: "",
  },
];
interface Data {
  name: string;
  duration: number;
  img: string;
  description: string;
}

interface Props {
  data: Data[];
}

export default function RadioGroupTab({ data }: Props) {
  const [selected, setSelected] = useState(data[0]);

  const { nextStep, beforeStep } = useContext(NewTvContext);

  return (
    <section className="w-full px-4 py-16 max-h-[500px] overflow-hidden scrollbar-thin scroll-auto flex flex-col justify-between">
      <div className=" w-full ">
        <RadioGroup value={selected} onChange={setSelected}>
          <RadioGroup.Label className="sr-only">
            Seleccione una plantilla
          </RadioGroup.Label>
          <div className="space-y-2 grid grid-cols-3 gap-x-3">
            {data.map((plan) => (
              <RadioGroup.Option
                key={plan.name}
                value={plan}
                className={({ active, checked }) =>
                  `${
                    active
                      ? "ring-2 ring-white/60 ring-offset-2 ring-offset-sky-300"
                      : ""
                  }
                  ${checked ? "bg-sky-900/75 text-white" : "bg-white"}
                    relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none`
                }
              >
                {({ active, checked }) => (
                  <>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex flex-col items-center">
                        <div className="text-sm">
                          <RadioGroup.Label
                            as="p"
                            className={`font-medium flex gap-x-3 ${
                              checked ? "text-white" : "text-gray-900"
                            }`}
                          >
                            <h3 className="font-bold text-2xl ">{plan.name}</h3>
                            {checked && (
                              <div className="shrink-0 text-white">
                                <CheckIcon />
                              </div>
                            )}
                          </RadioGroup.Label>
                          <RadioGroup.Description
                            as="span"
                            className={`inline ${
                              checked ? "text-sky-100" : "text-gray-500"
                            }`}
                          >
                            <img
                              src={plan.img}
                              alt={`${plan.name} image`}
                              className="h-full object-cover w-full rounded-full"
                              loading="eager"
                            />
                            <p>
                              {plan?.duration && (
                                <span className="font-semibold text-xl">
                                  Duración: {plan?.duration / 1000} sec por
                                  pagina
                                </span>
                              )}
                            </p>
                          </RadioGroup.Description>
                          {plan.description && <p>{plan.description}</p>}
                        </div>
                      </div>
                      <div className="shrink-0 text-white"></div>
                    </div>
                  </>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle cx={12} cy={12} r={12} fill="#fff" opacity="0.2" />
      <path
        d="M7 13l3 3 7-7"
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
