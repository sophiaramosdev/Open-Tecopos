import { useEffect, useState } from "react";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/misc/GenericModal";
import { useAppSelector } from "../../../../store/hooks";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { formatCurrencyWithOutCurrency, formatDateForReportsWithYearAndHour, generatePdf, mathOperation } from "../../../../utils/helpers";
import PdfFinancialEconomicCycleReporte from "../pdfs/PdfFinancialEconomicCycleReporte";
import { getColorCashOperation } from "../../../../utils/tailwindcss";
import moment from "moment";
import { getCashOperationSpanish } from "../../../../utils/functions";
import CalendarEconomicCycle from "./CalendarEconomicCycle";
import Toggle from "../../../../components/forms/Toggle";
import RadioGroupForm from "../../../../components/forms/RadioGroup";
import MultiSelect from "../../../../components/forms/Multiselect";
import useServerEcoCycle from "../../../../api/useServerEconomicCycle";
import CashRegisterReport from "../report/CashRegisterReport";


function FinancialEconomicCycleSumaryModal({setShowModal}:any) {
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { getAreaSalesIncomes , areaSalesIncome , isLoading } = useServerEcoCycle()
  
  const stockAreas =
    areas
      ?.filter((area) => area.type === "SALE")
      .map(({ id, name }) => {
        return { id, name };
      }) || [];

  const [filterByDateModal, setFilterByDateModal] = useState(false);
  const [econCiclSelected, setEconCiclSelected] = useState<any>();
  const [showReportDataModal, setShowReportDataModal] = useState<
    any
  >();

 //React Hook Form
  const { register, handleSubmit, control, watch ,setValue} = useForm();

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => {
    if (data.economicCycleId === undefined) {
      toast.warn("Debe seleccionar un ciclo económico"); 
      return
    }   
   getAreaSalesIncomes( data.areaId, data.economicCycleId)
   setShowReportDataModal(areaSalesIncome)
  };
 
 
  return (
    <>
           <form onSubmit={handleSubmit(onSubmit)}>
            <h2 className="text-xl font-semibold mb-6">
               Resumen contable de ciclo económico
            </h2>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 items-center w-full">
                <span className="w-full">
                <Button
                 color="gray-200"
                 textColor="slate-900"
                 type="button"
                 name="Seleccionar ciclo económico"
                 outline
                 full
                 action={() => {
                  setFilterByDateModal(true);
                 }}
               />
                </span>
               { econCiclSelected?.openDate && econCiclSelected?.closedDate && 
               <span className="w-full">
               {formatDateForReportsWithYearAndHour(econCiclSelected?.openDate)} {(!!econCiclSelected?.openDate && !!econCiclSelected?.closedDate) ? "-" : "" } {formatDateForReportsWithYearAndHour(econCiclSelected?.closedDate)}
               </span>}

              </div>
                <div className="py-1 col-span-2">
                <MultiSelect 
                  name="areaId"
                  data={stockAreas}
                  label="Area *"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}/>
              </div>

              <div className="w-full flex justify-end gap-3 mt-4">
                <div>
                  <Button
                    color="slate-600"
                    textColor="slate-600"
                    type="submit"
                    name="Cancelar"
                    outline
                    action={() => {
                      setShowModal(false);
                    }}
                  />
                </div>
                <div>
                  <Button
                    color="slate-600"
                    type="submit"
                    name="Generar"
                    loading={isLoading}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </form>

          {filterByDateModal && (
        <Modal
          close={() => setFilterByDateModal(false)}
          state={filterByDateModal}
          size="m"
        >
          <CalendarEconomicCycle setShowDate={setFilterByDateModal} setValue={setValue} setEconCiclSelected={setEconCiclSelected} />
        </Modal>
      )}


      {!!showReportDataModal && (
        <Modal
          state={!!showReportDataModal}
          close={() => setShowReportDataModal(null)}
          size="l"
        >
         <span className="text-lg font-medium">Resumen contable de ciclo económico</span>
         <CashRegisterReport areaSalesIncome={areaSalesIncome} isLoading={isLoading} ecoCycle={null} />
        </Modal>
      )}
        </>
  )
}

export default FinancialEconomicCycleSumaryModal