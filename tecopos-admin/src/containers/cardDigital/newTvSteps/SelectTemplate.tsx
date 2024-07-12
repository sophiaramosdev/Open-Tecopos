import { useContext, useState } from "react";
//@ts-ignore
import img from '../../../assets/template.jpg';
import RadioGroupTab from "../template/RadioGrupTab";
import Button from "../../../components/misc/Button";
import { NewTvContext } from "../NewTv";

const plans = [
  {
    name: "Clásica carrusel de productos vertical",
    duration: 30000,
    img: img ,
    description: "",
  },
];


export default function SelectTemplate() {

  const { nextStep, beforeStep } = useContext(NewTvContext);

  return (
    <section className="w-full px-4 max-h-[500px] overflow-hidden scrollbar-thin scroll-auto flex flex-col justify-between">
      <RadioGroupTab data={plans} />
      <footer className="grid grid-cols-2 py-2 gap-2">
        {/* <Button
          name="Atrás"
          color="gray-900"
          action={beforeStep}
          textColor="slate-800"
          full
          outline
        /> */}
        <div></div>
        <Button name="Siguiente" color="slate-600" action={nextStep} />
      </footer>
    </section>
  );
}
