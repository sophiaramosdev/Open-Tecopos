import { useState } from "react";
import { useParams } from "react-router";
import Breadcrumb, { PathInterface } from "../../components/navigation/Breadcrumb";
import useServerArea from "../../api/useServerArea";
import { Cog8ToothIcon, PencilIcon } from "@heroicons/react/24/outline";
import Modal from "../../components/modals/GenericModal";
import Button from "../../components/misc/Button";
import { useAppSelector } from "../../store/hooks";
import { useNavigate } from "react-router";
import DetailSalesContainer from "./sales/DetailSalesContainer";
import EditAreaComponent from "./EditAreaComponent";
import DetailConfigStockContainer from "./stock/configurations/DetailConfigStockContainer";

const DetailAreaContainer = () => {
  const { areaId } = useParams();
  const {areas} = useAppSelector(state=>state.nomenclator);
  const goTo = useNavigate();
  const { updateArea, isFetching } = useServerArea();
  const [open, setOpen] = useState(false);

  const currentArea = areas.find(area=>area.id === Number(areaId))

  //Edit Area function ----------------------------------------------------------------
  const submit = (data:Record<string,string|number|boolean>)=>updateArea(Number(currentArea?.id) ?? 0, data, ()=>setOpen(false))

  //--------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------------------
  const paths:PathInterface[]=[
    {
      name:"Mis áreas",
      action:()=>goTo("/configurations/my_areas")
    },
    {
      name:currentArea?.name??""
    }
  ]

  //------------------------------------------------------------------------------------------

  return (
    <>
      <div className="sticky flex items-center justify-between gap-5 bg-gray-100 py-2 px-2 z-20 w-full h-16">
        <Breadcrumb
          icon={<Cog8ToothIcon className="h-7 text-gray-600" />}
          paths={paths}
        />        
        <div className="flex gap-2 items-center">
          <Button
            name="Editar"
            color="slate-500"
            action={() => setOpen(true)}
            icon={<PencilIcon className="h-4" />}
          />          
        </div>
      </div>
      {currentArea?.type === "SALE" && <DetailSalesContainer />}
      {currentArea?.type === "STOCK" && <DetailConfigStockContainer />}

      {open && (
        <Modal state={open} close={() => setOpen(false)}>
          <EditAreaComponent id={Number(currentArea?.id) ?? 0} loading={isFetching} submit={submit}/>
        </Modal>
      )}
    </>
  );
};

export default DetailAreaContainer;
