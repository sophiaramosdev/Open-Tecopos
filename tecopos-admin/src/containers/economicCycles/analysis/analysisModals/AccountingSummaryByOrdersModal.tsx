import { useEffect, useState } from "react";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/misc/GenericModal";
import { useAppSelector } from "../../../../store/hooks";
import { FieldValues, SubmitHandler, useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { formatCurrencyWithOutCurrency, formatDateHours, generatePdf, mathOperation } from "../../../../utils/helpers";
import { getColorCashOperation } from "../../../../utils/tailwindcss";
import moment from "moment";
import { getCashOperationSpanish } from "../../../../utils/functions";
import RadioGroupForm from "../../../../components/forms/RadioGroup";
import MultiSelect from "../../../../components/forms/Multiselect";
import useServerEcoCycle from "../../../../api/useServerEconomicCycle";
import DateInput from "../../../../components/forms/DateInput";
import { useServerBilling } from "../../../../api/useServerBilling";
import { FaRegFilePdf } from "react-icons/fa";
import { OrdersManagedByInterface } from "../../../../interfaces/ServerInterfaces";
import Criteria from "../../../analysis/SaleByOrdersTabs/Criteria";
import SearchCriteriaComponent, { BasicTypeFilter, DateTypeFilter, SelectTypeFilter } from "../../../../components/misc/SearchCriteriaComponent";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import useCouponsUtility from "../utility/useCouponsUtility";
import { IoAlertCircleOutline } from "react-icons/io5";
import SalesByGrossMerchandiseReport from "../report/AccountingSummaryByOrdersReport";


function AccountingSummaryByOrdersModal({setShowModal}:any) {
  const { getAccountingSummaryByOrders , isFetching } = useServerBilling()

  const { coupons, couponSearch, loadingCoupons, setCouponSearch } = useCouponsUtility(700);

  const { areas } = useAppSelector(
    (state) => state.nomenclator
  );
  const areaSalesSelector: SelectInterface[] = areas
    .filter((item) => item.type === "SALE")
    .map((area) => ({
      id: area.id,
      name: area.name,
    }));

     const [showReportDataModal, setShowReportDataModal] = useState<any>();
 //React Hook Form
  const { handleSubmit} = useForm();

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => { 
    getAccountingSummaryByOrders(data , setShowReportDataModal)
  };
 

  //Management filters ------------------------------------------------------------------------

  const availableFilters: (
    | BasicTypeFilter
    | DateTypeFilter
    | SelectTypeFilter
  )[] = [];

  availableFilters.push(
    //Rango de fechas
    {
      name: "dateRange",
      isRequired: true,
      label: "Rango de fechas",
      type: "datepicker-range-including-time",
      datepickerRange: [
        {
          name: "dateFrom",
          label: "Desde",
          isUnitlToday: true,
        },
        {
          name: "dateTo",
          label: "Hasta",
          isUnitlToday: true,
        },
      ],
    },
    //Fecha de entrega
    {
      name: "deliveryAt",
      label: "Fecha de entrega",
      type: "datepicker",
    },
    //Punto de venta
    {
      label: "Punto de venta",
      name: "areaSalesId",
      type: "select",
      data: areaSalesSelector,
    },
    //Origen
    {
      label: "Origen",
      name: "origin",
      type: "multiselect",
      data: [
        { name: "Puntos de venta", id: "pos" },
        { name: "Tienda online", id: "online" },
      ],
    },
    //Incluir órdenes consumo casa
    {
      label: "Incluir órdenes consumo casa",
      name: "houseCosted",
      type: "boolean",
    },
    //Cupones
    {
      label: "Cupones",
      name: "coupons",
      type: "multiselect",
      onChange: (value: string) => {
        if (typeof value === "string") setCouponSearch(value);
      },
      isLoading: loadingCoupons,
      defaultValue: couponSearch.split(","),
      data: coupons,
    },
    //Descuentos
    {
      label: "Descuentos",
      name: "hasDiscount",
      type: "boolean",
    },
    {
      label: "% descuento",
      name: "discount",
      type: "input",
    },  
    //Pagado
    {
      label: "Pagado",
      name: "isPayed",
      type: "boolean",
    },
    //Estado
    {
      label: "Estado",
      name: "status",
      type: "multiselect",
      data: [
        { name: "Creada", id: "CREATED" },
        { name: "Activa", id: "ACTIVE" },
        { name: "Cerrada", id: "CLOSED" },
        { name: "Despachada", id: "DISPATCHED" },
        { name: "Recibida", id: "RECEIVED" },
        { name: "Procesando", id: "IN_PROCESS" },
        { name: "Completada", id: "COMPLETED" },
        { name: "Pendiente de pago", id: "PAYMENT_PENDING" },
        { name: "En espera", id: "WAITING" },
        { name: "Cancelada", id: "CANCELLED" },
        { name: "Reembolsada", id: "REFUNDED" },
        { name: "Con errores", id: "WITH_ERRORS" },
        { name: "Facturada", id: "BILLED" },
        { name: "En tránsito", id: "IN_TRANSIT" },
        { name: "Entregada", id: "DELIVERED" },
      ],
    },
    //Numero de operación
    {
      name: "operationNumber",
      label: "No.Factura",
      type: "input",
    },
    //Método de pago
    {
      label: "Método de pago",
      name: "paymentWay",
      type: "multiselect",
      data: [
        { name: "Transferencia", id: "TRANSFER" },
        { name: "Efectivo", id: "CASH" },
        // { name: "TropiPay", id: "TROPIPAY" },
      ],
    },
  );
  
  return (
    <>
           <div>
            <h2 className="text-xl font-semibold mb-6">
            Resumen contable por órdenes
               </h2>
               <div>
               <SearchCriteriaComponent
                 filterAction={(data: FieldValues) => onSubmit(data)}
                 filters={availableFilters}
                 loading={isFetching}
               />
             </div>
          </div>


        {!!showReportDataModal && (
          <Modal
            state={!!showReportDataModal}
            close={() => setShowReportDataModal(null)}
            size="m"
          >    
          <h2 className="text-xl font-semibold mb-6">
          Resumen contable por órdenes
          </h2>
             <SalesByGrossMerchandiseReport areaSalesIncome={[showReportDataModal]} isLoading={isFetching} ecoCycle={null}/>
          </Modal>
        )} 
        </>
  )
}

export default AccountingSummaryByOrdersModal