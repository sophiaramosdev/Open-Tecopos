import { useEffect, useMemo, useState } from "react";
import useServerCoupon from "../../../../api/useServerCoupons";
import useServerEcoCycle from "../../../../api/useServerEconomicCycle";
import { useAppSelector } from "../../../../store/hooks";
import { useDebounceValue } from "../../../../hooks";
import { BasicType, SelectInterface, SelledProductReport } from "../../../../interfaces/InterfacesLocal";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { deleteUndefinedAttr, exportExcel, formatCurrency, roundTwoDecimals } from "../../../../utils/helpers";
import { ExtendedNomenclator, PriceInvoiceInterface } from "../../../../interfaces/ServerInterfaces";
import GenericTable, { DataTableInterface } from "../../../../components/misc/GenericTable";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import SearchCriteriaComponent, { BasicTypeFilter, DateTypeFilter, SelectTypeFilter } from "../../../../components/misc/SearchCriteriaComponent";
import Breadcrumb from "../../../../components/navigation/Breadcrumb";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import SalesByGrossMerchandiseReport from "../report/SalesByGrossMerchandiseReport";
import { orderStatus } from "../../../../utils/staticData";
import { IoAlertCircleOutline } from "react-icons/io5";



export default function SalesByGrossMerchandise() {
  const { getSelledReport, selledReport, isLoading } = useServerEcoCycle();
  const {
    allCoupons,
    getAllCoupons,
    outLoading: loadingCoupons,
  } = useServerCoupon();

  const [showReportDataModal, setShowReportDataModal] = useState<any>();

  const { areas, salesCategories, productCategories } = useAppSelector(
    (state) => state.nomenclator
  );
  const [clearFilters, setClearFilters] = useState(false);


  const [couponSearch, setCouponSearch] = useState("");
  const couponSearchValue = useDebounceValue(couponSearch, 700);


  useEffect(() => {
    if (couponSearchValue.length > 1) {
      getAllCoupons({ all_data: true, search: couponSearchValue });
    }
  }, [couponSearchValue]);

  const coupons = useMemo(
    () =>
      allCoupons.map((cupon) => ({
        id: cupon.code,
        name: cupon.code,
      })),
    [allCoupons]
  );

  const areaSalesSelector: SelectInterface[] = areas
    .filter((item) => item.type === "SALE")
    .map((area) => ({
      id: area.id,
      name: area.name,
    }));

  const salesCategorySelector: SelectInterface[] = salesCategories.map(
    (cat) => ({ id: cat.id, name: cat.name })
  );
  const productCategorySelector: SelectInterface[] = productCategories.map(
    (cat) => ({ id: cat.id, name: cat.name })
  );

  //Submit form ----------------------------------------------------------------------------------
  const onSubmit: SubmitHandler<BasicType> = (data) => {
    setShowReportDataModal(true)
    if (Object.keys(data).length > 0) {
      const allFilters = deleteUndefinedAttr({
        ...data,
      });
      getSelledReport(allFilters);
      setClearFilters(false);
    } else setClearFilters(true);
  };

  //--------------------------------------------------------------------------------------------
  const orderStatusSelector: SelectInterface[] = orderStatus.map((itm) => ({
    id: itm.code,
    name: itm.value,
  }));

  //Management filters ------------------------------------------------------------------------
  const availableFilters: (
    | BasicTypeFilter
    | DateTypeFilter
    | SelectTypeFilter
  )[] = [];

  availableFilters.push(
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
    {
      label: "Punto de venta",
      name: "areaSalesId",
      type: "select",
      data: areaSalesSelector,
    },
    {
      label: "Categoría de venta",
      name: "salesCategoryId",
      type: "select",
      data: salesCategorySelector,
    },
    {
      type: "multiselect",
      name: "status",
      label: "Estado",
      data: orderStatusSelector,
    },
    {
      label: "Categoría de almacén",
      name: "productCategoryId",
      type: "select",
      data: productCategorySelector,
    },
    {
      label: "Origen",
      name: "origin",
      type: "multiselect",
      data: [
        { name: "Puntos de venta", id: "pos" },
        { name: "Tienda online", id: "online" },
      ],
    },
    {
      label: "Incluir órdenes consumo casa",
      name: "includeHouseCostedOrder",
      type: "boolean",
    },
    {
      label: "Cliente",
      name: "clientId",
      type: "select",
      asyncData: {
        url: "/customer",
        dataCode: ["firstName", "lastName", "email"],
        defaultParams: { page: 1 },
        idCode:"id"
      },     
    },
    {
      label: "Proveedor",
      name: "supplierId",
      type: "select",
      asyncData: {
        url: "/administration/supplier",
        dataCode: "name",
        defaultParams: { page: 1 },
        idCode:"id"
      },     
    },
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
    }
  );

  //-----------------------------------------------------------------------------


  
  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Venta bruta de mercancías</h2>
      <div className="flex items-center space-x-2 p-2 border-t-4 border-yellow-500 mb-2 bg-gradient-to-b from-yellow-100 to-yellow-50 rounded-md">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-transparent">
          <IoAlertCircleOutline size={24} style={{ backgroundColor: 'transparent' }} className="text-yellow-500 bg-transparent" />
        </div>
        <p className="text-sm text-gray-700">
          Este reporte solo tiene en cuenta el valor de la mercancía/producto
          vendido individualmente. No incluye los descuentos, comisiones,
          cupones aplicados a la orden/factura.
        </p>
      </div>

      <SearchCriteriaComponent
        filterAction={(data: FieldValues) => onSubmit(data)}
        filters={availableFilters}
      />

      {!!showReportDataModal && (
        <Modal
          state={!!showReportDataModal}
          close={() => setShowReportDataModal(null)}
          size="l"
        >
          <h2 className="text-xl font-semibold mb-6">
            Venta bruta de mercancías
          </h2>
          <SalesByGrossMerchandiseReport
            selledReport={selledReport}
            isLoading={isLoading}
            clearFilters={clearFilters}
          />
        </Modal>
      )}
    </>
  );
}


