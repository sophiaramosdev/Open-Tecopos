import { useForm } from "react-hook-form";
import { useAppSelector } from "../../../../../store/hooks";
import { useParams } from "react-router-dom";
import Select from "../../../../../components/forms/Select";
import Button from "../../../../../components/misc/Button";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import { useContext } from "react";
import { MovementsContext } from "./WizzardContainer";

interface AreaSelector {
  close: Function;
}

const MovementAreaSelector = ({ close }: AreaSelector) => {
  const { control, trigger, watch } = useForm<Record<string, string | number>>();
  const { setValue } = useContext(MovementsContext);
  const { stockId: areaId } = useParams();
  const { areas } = useAppSelector((state) => state.nomenclator);
  
  const setArea = async () => {
    if (await trigger()) {
      const areaTo = watch("area");
      setValue!("stockAreaToId", areaTo);
      close();
    }
  };
  const areasSelector: SelectInterface[] = areas
    .filter((item) => item.id !== Number(areaId) && item.type === "STOCK")
    .map((item) => ({ name: item.name, id: item.id }));

  return (
    <>
      <Select
        data={areasSelector}
        label="Seleccione un área destino"
        name="area"
        control={control}
        rules={{ required: "Debe indicar un área destino" }}
      />
      <div className="flex flex-row-reverse py-2">
        <Button type="button" color="slate-600" name="Aceptar" action={setArea} />
      </div>
    </>
  );
};

export default MovementAreaSelector;
