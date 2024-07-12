import { useState, useEffect, FC } from "react";
import { cleanObj} from "../../../utils/helpers";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "../../../store/hooks";
import SearchCriteriaComponent, {
  BasicTypeFilter,
  DateTypeFilter,
  SelectTypeFilter,
} from "../../../components/misc/SearchCriteriaComponent";
import useCouponsUtility from "./useCouponsUtility";
import { toast } from "react-toastify";



export default function Criteria(props: any) {

  const { getAllSalesbyOrders, salesbyOrders, isLoading } = props.dataAccess;

  const { areas } = useAppSelector(
    (state) => state.nomenclator
  );


  useForm();

  useEffect(() => {
    if (!isLoading && (Array.isArray(salesbyOrders?.orders) ? salesbyOrders.orders.length > 0 : false)) {
      toast.success("Información cargada correctamente, por favor revise pestaña Resultados.");
    }
    if (!isLoading && (Array.isArray(salesbyOrders?.orders) ? salesbyOrders.orders.length === 0 : false)) {
      toast.error("Su búsqueda no ha arrojado ningún resultado, por favor intente nuevamente.");
    }
    }
  , [salesbyOrders]);

  const { coupons, couponSearch, loadingCoupons, setCouponSearch } = useCouponsUtility(700);


  const areaSalesSelector: SelectInterface[] = areas
    .filter((item) => item.type === "SALE")
    .map((area) => ({
      id: area.id,
      name: area.name,
    }));

  //Submit form ----------------------------------------------------------------------------------
  const onSubmit: SubmitHandler<BasicType> = (data) => {
    if (Object.keys(data).length > 0) {
      const allFilters = cleanObj({
        ...data,
      });
      getAllSalesbyOrders(allFilters);
    } 
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
  
 
  return (
    <div className={props.show ? '' : 'hidden'}>
      <SearchCriteriaComponent
        filterAction={(data: FieldValues) => onSubmit(data)}
        filters={availableFilters}
        loading={isLoading}
      />
    </div>
  );
}
