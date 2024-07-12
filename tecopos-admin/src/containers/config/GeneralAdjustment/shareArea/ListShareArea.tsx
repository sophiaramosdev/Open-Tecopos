import { useState, useEffect, useMemo } from "react";



import { BasicType, SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { ReportInterface } from "../../../../components/misc/ReportsComponent";

import GenericTable, { DataTableInterface, FilterOpts } from "../../../../components/misc/GenericTable";

import { PlusIcon } from "@heroicons/react/24/outline";


import Modal from "../../../../components/modals/GenericModal";



import NewShareAnArea from "./NewShareAnArea";
import useServerArea from "../../../../api/useServerArea";
import { useAppSelector } from "../../../../store/hooks";
import { ShareArea } from "../../../../interfaces/ServerInterfaces";
import DetailShareAreaModal from "./DetailShareAreaModal";


export default function ListShareArea() {

    const { areas} = useAppSelector(state=>state.nomenclator)

    const {

        isFetching,
        addShareArea,
        isLoading,
        sharesAreasConfiguration,
        getSharesAreasConfiguration,
        deleteShareArea

    } = useServerArea();

    useEffect(() => {
        
        getSharesAreasConfiguration();
    }, []);

    
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [openDetailModal, setOpenDetailModal] = useState<boolean>(false);
    const [currentShareArea, setCurrentShareArea] = useState<ShareArea | null>(null);

    const crud = {
      del:deleteShareArea,
      isLoading,
      isFetching    
  }

    //Select Areas data ------------------------------------------------------------------

    const selectDataArea: SelectInterface[] = [];

    areas.map((item) => {
        if(item.type === 'STOCK'){
            selectDataArea.push({
                id: item.id,
                name: item.name,
                disabled: false
            });
        }  
    });

  //Data for Table List --------------------------------------------------------------------

    const titles: string[] = ["Área","Negocio", "Compartida por"];
    const displayData: Array<DataTableInterface> = [];

    sharesAreasConfiguration.map(item =>
        displayData.push({
            rowId: item.id,
            payload: {
              "Área": item.area?.name,
              Negocio: item.sharedBusiness?.name,
              "Compartida por": item.sharedBy?.displayName,
            },
        })
    );

     //Action after click in RowTable
     const rowAction = (id:number) => {
        setOpenDetailModal(true);
        setCurrentShareArea(sharesAreasConfiguration.find((item) => item.id === id) ?? null);
      };

    const actions = [
        {
            icon: <PlusIcon className="h-7" title="Agregar área compartida" />,
            action: () => setOpenModal(true),
            title:"Nueva área compartida"
        },
    ];
       
    const submitAction = (data: Record<string, string>) => addShareArea(data, () => setOpenModal(false));
    
    //--------------------------------------------------------------------------------------

    return (
        <>
          <GenericTable
              tableTitles={titles}
              tableData={displayData}
              actions={actions}
              rowAction={rowAction}
              loading={ isLoading }
          />

          {openModal && (
              <Modal
                  state={openModal}
                  close={() => setOpenModal(false)}
                  size="m"
              >
                  <NewShareAnArea submitAction={submitAction} loading={isFetching} selectDataArea={selectDataArea} />
              </Modal>
          )}

          {openDetailModal &&  (
              
              <Modal
                  state={openDetailModal}
                  close={setOpenDetailModal}
                  size="m"
              >
                  <DetailShareAreaModal crud={crud} shareAreaData={currentShareArea} closeModal={()=>setOpenDetailModal(false)} />
              </Modal>
          )}      
        </>
    );
}
