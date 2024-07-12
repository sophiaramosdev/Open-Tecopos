import { SVGProps, useContext, useEffect, useState } from "react";
import Input from "../../../components/forms/Input";
import { NewTvContext } from "../NewTv";
import { CartDigitalContext } from "../CartDigital";
import TextArea from "../../../components/forms/TextArea";
import CheckboxInput from "../../../components/forms/CheckboxInput";
import { IconScream } from "../IconSream";
import Button from "../../../components/misc/Button";
import RadioGroupForm from "../../../components/forms/RadioGroup";
import { FaLayerGroup, FaPallet, FaPlus } from "react-icons/fa";
import { TbVersions } from "react-icons/tb";
import { toast } from "react-toastify";

const DetailsTV = () => {
  const [addPage, setAddPage] = useState(false);
  const { nextStep, beforeStep, control ,errors} = useContext(NewTvContext);
  const { isFetching } = useContext(CartDigitalContext);

  useEffect(()=>{
    if(errors?.orientation && Object.keys(errors)?.length === 1){
      toast.warn("Debe seleccionar una orientación.")
    }
  },[errors])
  const orientations = [
    // {
    //   icon: FaLayerGroup,
    //   title: "0^",
    //   description:
    //     "Formato contable y tangible que se gestiona a través de operaciones de entradas y salidas de un área",
    //   value: 0,
    // },
    {
      icon: TbVersions,
      title: "90°",
      description:
        "Ajuste su televisor a una posición de 90 grados para disfrutar de una experiencia visual óptima. Esta orientación permite un montaje vertical perfecto, ideal para pantallas publicitarias, monitores informativos.",
      value: 90,
    },
    {
      icon: TbVersions,
      title: "270",
      description:
        "Ajuste su televisor a una posición de 90 grados para disfrutar de una experiencia visual óptima. Esta orientación permite un montaje vertical perfecto, ideal para pantallas publicitarias, monitores informativos.",
      value: 270,
    },
    // {
    //   icon: FaPallet,
    //   title: "180^",
    //   description:
    //     "Productos contables y tangibles de almacén que corresonden a una misma agrupación y que cuentan con diferentes atributos",
    //   value: "VARIATION",
    // },
    // {
    //   icon: FaPlus,
    //   title: "270^",
    //   description: "Productos que hacen función de agrego en otros productos",
    //   value: "ADDON",
    // },
  ];

  return (
    <section className=" h-[500px] bg-white rounded-md shadow-md border border-gray-200 p-5 flex flex-col justify-between">
      <section className="flex flex-col gap-y-3">
        <Input
          control={control}
          name="name"
          label="Nombre"
          rules={{ required: "Campo requerido" }}
        />
        <TextArea name="description" control={control} label="Descripción" />

        <div>
          <span className="font-semibold text-xl block">Orientación: </span>

          <RadioGroupForm
            data={orientations}
            name="orientation"
            control={control} 
            rules={{ required: "Campo requerido" }}
          />

        </div>
      </section>

      <footer className="grid grid-cols-2 py-2 gap-2 mt-3" >
        <Button
          name="Atrás"
          color="gray-900"
          action={beforeStep}
          textColor="slate-800"
          full
          outline
        />
        <Button
          name="Crear"
          color="slate-600"
          type="submit"
          loading={isFetching}
          disabled={isFetching}
        />
      </footer>
    </section>
  );
};

export function FaTelevision(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.25em"
      height="1em"
      viewBox="0 0 1920 1536"
      {...props}
    >
      <path
        fill="currentColor"
        d="M1792 1120V160q0-13-9.5-22.5T1760 128H160q-13 0-22.5 9.5T128 160v960q0 13 9.5 22.5t22.5 9.5h1600q13 0 22.5-9.5t9.5-22.5m128-960v960q0 66-47 113t-113 47h-736v128h352q14 0 23 9t9 23v64q0 14-9 23t-23 9H544q-14 0-23-9t-9-23v-64q0-14 9-23t23-9h352v-128H160q-66 0-113-47T0 1120V160Q0 94 47 47T160 0h1600q66 0 113 47t47 113"
      />
    </svg>
  );
}

export default DetailsTV;
