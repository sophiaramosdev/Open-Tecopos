import { useState } from "react";
import Modal from "../../../../components/misc/GenericModal";
import { useAppSelector } from "../../../../store/hooks";
import { FieldValues, SubmitHandler} from "react-hook-form";
import useServerEcoCycle from "../../../../api/useServerEconomicCycle";
import SearchCriteriaComponent, { BasicTypeFilter, DateTypeFilter, SelectTypeFilter } from "../../../../components/misc/SearchCriteriaComponent";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import SalesByOrdersReport from "../report/SalesByOrdersReport";
import PdfAndExcelSalesByOrders from "../pdfsandExcel/PdfAndExcelSalesByOrders";
import useCouponsUtility from "../utility/useCouponsUtility";


function SalesByOrdersModal({setShowModal}:any) {
  const { getAllSalesbyOrders, salesbyOrders, isLoading } = useServerEcoCycle();
  const dataAccess = { getAllSalesbyOrders, salesbyOrders, isLoading };
  const { areas } = useAppSelector(
    (state) => state.nomenclator
  );

  const { coupons, couponSearch, loadingCoupons, setCouponSearch } = useCouponsUtility(700);


  const areaSalesSelector: SelectInterface[] = areas
    .filter((item) => item.type === "SALE")
    .map((area) => ({
      id: area.id,
      name: area.name,
    }));



/*   const {getReportOrdersManagedBy, reportOrdersManagedBy , isFetching} = useServerBilling();
  */
     const [showReportDataModal, setShowReportDataModal] = useState<any>();

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => { 
    getAllSalesbyOrders(data);
    setShowReportDataModal(true)
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
    //Cliente
    {
      label: "Cliente",
      name: "clientId",
      type: "select",
      asyncData: {
        url: "/customer",
        dataCode: ["firstName", "lastName", "email"],
        defaultParams: { page: 1 },
        idCode: "id"
      },
    },
    //Manejado por**
    {
      label: "Manejado por",
      name: "managedById",
      type: "select",
      asyncData: {
        url: "/security/users",
        dataCode: ["username", "displayName", "email"],
        defaultParams: { page: 1 },
        idCode: "id"
      },
    },
    //Vendido por**
    {
      label: "Vendido por",
      name: "salesById",
      type: "select",
      asyncData: {
        url: "/security/users",
        dataCode: ["username", "displayName", "email"],
        defaultParams: { page: 1 },
        idCode: "id"
      },
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
    //Comisiones
    {
      label: "Comisiones",
      name: "hasCommission",
      type: "boolean",
    },
    //Incluye propinas
    {
      label: "Incluye propinas",
      name: "hasTips",
      type: "boolean",
    },
    //Recogida en tienda
    {
      label: "Recogida en tienda",
      name: "pickUpInStore  ",
      type: "boolean",
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
/*   const [current, setCurrent] = useState("report");
  const tabs: TabsAttr[] = [
    {
      name: "Reporte",
      current: current === "report",
      href: "report",
    },
    {
      name: "Resumen",
      current: current === "summary",
      href: "summary",
    },
  ]; */
  return (
    <>
      <div>
        <h2 className="text-xl font-semibold mb-6">Buscador de órdenes</h2>
        <div>
          <SearchCriteriaComponent
            filterAction={(data: FieldValues) => onSubmit(data)}
            filters={availableFilters}
            loading={isLoading}
          />
        </div>
      </div>

      {!!showReportDataModal && (
        <Modal
          state={!!showReportDataModal}
          close={() => setShowReportDataModal(null)}
          size="l"
        >
          <h2 className="text-xl font-semibold mb-6">Buscador de órdenes</h2>
          <section className="grid grid-cols-12">
            {/* <SideNav tabs={tabs} action={setCurrent} className="col-span-2" /> */}
            <section className="overflow-auto scrollbar-thin col-span-12 px-5">
             
                <div className="flex justify-end items-center w-full">
                <PdfAndExcelSalesByOrders
                  dataAccess={dataAccess}
                  show={showReportDataModal}
                />
              </div>
          
             
                <SalesByOrdersReport
                  dataAccess={dataAccess}
                  show={showReportDataModal}
                />
             
              {/* {current === "summary" && (
                <SalesByOrdersSummary
                  dataAccess={resumen}
                  show={showReportDataModal && !isLoading}
                />
              )} */}
            </section>
          </section>
        </Modal>
      )}
    </>
  );
}

export default SalesByOrdersModal