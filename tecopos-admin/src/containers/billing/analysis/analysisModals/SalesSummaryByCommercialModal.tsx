import { useEffect, useState } from "react";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/misc/GenericModal";
import { useAppSelector } from "../../../../store/hooks";
import { SubmitHandler, useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { formatCurrencyWithOutCurrency, formatDateHours, generatePdf, mathOperation } from "../../../../utils/helpers";
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
import DateInput from "../../../../components/forms/DateInput";
import { useServerBilling } from "../../../../api/useServerBilling";
import { FaRegFilePdf } from "react-icons/fa";
import PdfSalesSummaryByCommercial from "../pdfs/PdfSalesSummaryByCommercial";
import SalesSummaryByCommercial from "../report/SalesSummaryByCommercial";
import { OrdersManagedByInterface } from "../../../../interfaces/ServerInterfaces";


function SalesSummaryByCommercialModal({setShowModal}:any) {
  const {getReportOrdersManagedBy, reportOrdersManagedBy , isFetching} = useServerBilling();
  const [showReportDataModal, setShowReportDataModal] = useState<
  OrdersManagedByInterface | null 
  >();

 //React Hook Form
  const { register, handleSubmit, control, watch ,setValue} = useForm();

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => { 
     getReportOrdersManagedBy(data.dateFrom, data.dateTo, setShowReportDataModal)
  };
 
  const fieldValues = useWatch({ control, exact: false });
 
  return (
    <>
           <form onSubmit={handleSubmit(onSubmit)}>
            <h2 className="text-xl font-semibold mb-6">
             Resumen de ventas por comerciales
            </h2>
            <div className="flex flex-col gap-2 w-full">
              <div className='py-2'>
                  <DateInput
                    name='dateFrom'
                    label='Desde *'
                    control={control}
                    rules={{ required: 'Este campo es requerido' }}
                    untilToday
                    includeTime={true}
                  />
                </div>
                <div className='py-2'>
                  <DateInput
                    name='dateTo'
                    label='Hasta *'
                    control={control}
                    rules={{
                      required: 'Este campo es requerido',
                      validate: (dateTo) =>
                        new Date(dateTo) >= new Date(fieldValues.dateFrom),
                    }}
                    untilToday
                    includeTime={true}
                  />
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
                    loading={isFetching}
                    disabled={isFetching}
                  />
                </div>
              </div>
            </div>
          </form>


      {!!showReportDataModal && (
        <Modal
          state={!!showReportDataModal}
          close={() => setShowReportDataModal(null)}
          size="l"
        >
         <SalesSummaryByCommercial showReportDataModal={showReportDataModal}/>
        </Modal>
      )}
        </>
  )
}

export default SalesSummaryByCommercialModal