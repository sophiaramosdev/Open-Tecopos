import Button from "../../../../../components/misc/Button";
import ComboBox from "../../../../../components/forms/Combobox";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import { AreasInterface } from "../../../../../interfaces/ServerInterfaces";
import { useContext } from "react";
import { DispatchContext } from "./DispatchWizard";

interface AreasSelector {
  allAreas: AreasInterface[];
  sharesAreas: AreasInterface[];
}
const AreasSelectorStep = ({ allAreas, sharesAreas }: AreasSelector) => {
  const { control, watch, trigger, setCurrentStep, setValue } = useContext(DispatchContext);

  const currentOriginArea:number = watch!("stockAreaFromId");
  const currentDestinationArea:number = watch!("stockAreaToId");

  //Data for Select ---------------------------------------------------------------------------
  const originStocks: SelectInterface[] = allAreas
    .map((item) => ({ id: item.id, name: item.name }))
    .filter((item) => item.id !== currentDestinationArea);

  const selectDisabled = !watch!("stockAreaFromId");
  const destinationStock = allAreas
    .map((item) => ({ id: item.id, name: item.name }))
    .filter((item) => item.id !== currentOriginArea);
  sharesAreas.map((item) =>
    destinationStock.push({ id: item.id, name: item.name })
  );
  //----------------------------------------------------------------------------------------------

  //Submit Action ---------------------------------------------------------------------------------
  const onSubmit = async() => {
    if(await trigger!(["stockAreaFromId", "stockAreaToId"])){ 
     const stockFromName = originStocks.find(orig=>orig.id === currentOriginArea)!.name;
     const stockToName = destinationStock.find(dest=>dest.id === currentDestinationArea)!.name;
     setValue!("originAreaName", stockFromName);
     setValue!("destinationAreaName", stockToName);
     setCurrentStep!(1)
   }
 };  

  //---------------------------------------------------------------------------------------------

  return (
    <>
      <div className="grid grid-cols-2 gap-2 h-96">
        <div className="border border-slate-300 p-3 rounded-md overflow-y-auto scrollbar-thin">
          <ComboBox
            name="stockAreaFromId"
            data={originStocks}
            control={control}
            rules={{ required: "Debe indicar un Almacén Origen" }}
            label="Seleccione un Almacén Origen"
            defaultValue={currentOriginArea}
          />
        </div>
        <div className="border border-slate-300 p-3 rounded-md overflow-y-auto scrollbar-thin">
          <ComboBox
            name="stockAreaToId"
            data={destinationStock}
            control={control}
            rules={{ required: "Debe indicar un Almacén Destino" }}
            label="Seleccione un Almacén Destino"
            disabled={selectDisabled}
            defaultValue={currentDestinationArea}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 py-2 gap-2">
        <div className="col-span-1"></div>
        <Button name="Siguiente" color="slate-600" type="button" action={onSubmit} full />
      </div>
    </>
  );
};

export default AreasSelectorStep;
