/* eslint-disable @typescript-eslint/no-redeclare */
import { useEffect, useState, createContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  BasicType,
} from "../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../store/hooks";
import Button from "../../components/misc/Button";
import DateInput from "../../components/forms/DateInput";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import { DuplicatorInterface, ProductInterface } from "../../interfaces/ServerInterfaces";
import { useParams } from "react-router";
import GenericTable, { DataTableInterface } from "../../components/misc/GenericTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import Modal from "../../components/misc/GenericModal";
import StateSpanForTable from "../../components/misc/badges/StateSpanForTable";
import { toast } from "react-toastify";
import AddNewDuplicatorRuleModal from "./duplicator/AddNewDuplicatorRuleModal";
import ModifyDuplicatorRuleModal from "./duplicator/ModifyDuplicatorRuleModal";
import useServerProduct from "../../api/useServerProducts";
import { CurrencyInterface } from "../../interfaces/ServerInterfaces";

interface NewRuleCtx {
  allDuplications: DuplicatorInterface[];
  setNewRule: Function;
  setmodifyRule: Function;
  setAllDuplications: Function;
  modifyRuleID: number;
  allProducts: ProductInterface[];
  availableCurrencies: Array<CurrencyInterface>;
}


const newRuleContext: Partial<NewRuleCtx> = {};

export const NewRuleContext = createContext(newRuleContext);

const Duplicator = () => {
  const { ecoCycleId } = useParams();

  const { availableCurrencies } = useAppSelector(state => state.init.business!)

  const { handleSubmit, control } = useForm();
  const { areas } = useAppSelector((state) => state.nomenclator);

  const { isFetching, postEconomicCycleDuplicator, getAllDuplicatorAreaSales, allDuplicatorAreaSales } = useServerEcoCycle();

  const [allDuplications, setAllDuplications] = useState<DuplicatorInterface[]>([])
  const [newRule, setNewRule] = useState<boolean>(false)
  const [modifyRule, setmodifyRule] = useState<boolean>(false)
  const [modifyRuleID, setmodifyRuleID] = useState<number>()

  const { getAllProducts, allProducts } = useServerProduct();


  useEffect(() => {
    getAllProducts({
      type: "STOCK,MENU,ADDON,COMBO,VARIATION",
      search: '  ',
      all_data: true,
    })
  }, []);

  useEffect(() => {

    getAllDuplicatorAreaSales()
  }, [])


  const onSubmit: SubmitHandler<BasicType> = (data: any) => {
    const {
      registerAt,
    } = data

    if (registerAt === undefined) {
      toast.error("Seleccione fecha de registro");
    } else {
      const dataToSend = {
        registerAt,
        economicCycleId: ecoCycleId,
        salesAreas: allDuplications
      }

      postEconomicCycleDuplicator(dataToSend)
      setAllDuplications([])
    }

  };


  const tableTitles: string[] = [
    'Desde',
    'Hasta',
    'Mantener datos'
  ];

  const tableData: DataTableInterface[] = [];
  allDuplications.map((item: DuplicatorInterface, index) =>
    tableData.push({
      rowId: index,
      payload: {
        'Desde': item.areasFromId.map(element => {
          const areaName = areas.find(area => area.id === element)?.name
          return (
            <p className="mr-2 py-4 text-sm text-gray-500 text-ellipsis text-center">{areaName}</p>
          )
        }),
        'Hasta': allDuplicatorAreaSales.find(dupArea => dupArea.id === item.areaToId)?.name,
        'Mantener datos': <StateSpanForTable
          currentState={item.keepSameData}
          greenState={'Si'}
          redState={'No'}
        />
      },
    })
  );

  const tableActions = [
    {
      title: 'Nueva regla',
      icon: <PlusIcon className='h-5' />,
      action: () => setNewRule(true),
    }

  ];

  const rowAction = (id: number) => {
    setmodifyRuleID(id);
    setmodifyRule(true);
  };

  return (
    <>
      <div className="h-screen bg-white rounded-md shadow-md border border-gray-200 p-5">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-y-3 items-stretch h-full"
        >
          <div className="w-1/2">
            <DateInput
              name={"registerAt"}
              label={"Fecha de registro *"}
              control={control}
            // rules={{ required: "Este campo es requerido" }}
            />
          </div>

          <GenericTable
            tableTitles={tableTitles}
            tableData={tableData}
            actions={tableActions}
            rowAction={rowAction}
            loading={isFetching}
          />

          <div className="flex justify-end self-end py-5">
            <Button
              color="slate-600"
              name="Planificar"
              type="submit"
              loading={isFetching}
              disabled={isFetching}
            />
          </div>
        </form>
      </div>

      <NewRuleContext.Provider value={{
        allDuplications,
        setAllDuplications,
        setNewRule,
        modifyRuleID,
        setmodifyRule,
        allProducts,
        availableCurrencies,
      }}>
        {newRule && (
          <Modal
            close={() => setNewRule(false)}
            state={newRule}
            size='m'
          >
            <AddNewDuplicatorRuleModal allDuplicatorAreaSales={allDuplicatorAreaSales} isFetching={isFetching} />

          </Modal>
        )}

        {modifyRule && (
          <Modal
            close={() => setmodifyRule(false)}
            state={modifyRule}
            size='m'
          >
            <ModifyDuplicatorRuleModal allDuplicatorAreaSales={allDuplicatorAreaSales} isFetching={isFetching} />

          </Modal>
        )}

      </NewRuleContext.Provider>




    </>

  );
};

export default Duplicator;
