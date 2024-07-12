import { useEffect, useMemo, useState } from "react";
import SearchCriteriaComponent, {
  BasicTypeFilter,
  DateTypeFilter,
  SelectTypeFilter,
} from "../../../../components/misc/SearchCriteriaComponent";
import {
  BasicType,
  SelectInterface,
} from "../../../../interfaces/InterfacesLocal";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import useServerCoupon from "../../../../api/useServerCoupons";
import { exportExcel, formatCurrency } from "../../../../utils/helpers";
import {
  CouponInterface,
  CustomerSumarizeOrder,
  PriceInvoiceInterface,
} from "../../../../interfaces/ServerInterfaces";
import { orderStatus } from "../../../../utils/staticData";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import { PiMicrosoftExcelLogo } from "react-icons/pi";
import { SubmitHandler, useForm } from "react-hook-form";
import Modal from "../../../../components/misc/GenericModal";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import { useAppSelector } from "../../../../store/hooks";

interface SumaryCoupon {
  coupon: CouponInterface | null;
}

//==========================================================================
const SumaryContainer = ({ coupon }: SumaryCoupon) => {
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { getCustomerSumarizeOrder, customerSumarizeOrders, isFetching } =
    useServerCoupon();
  const [filter, setFilter] = useState<BasicType | null>(null);
  const [exportModal, setExportModal] = useState(false);

  const orderStateSelector: SelectInterface[] = orderStatus.map((item) => ({
    id: item.code,
    name: item.value,
  }));

  const areaSelector: SelectInterface[] =
    areas.map((item) => ({ id: item.id, name: item.name })) ?? [];

  const availableFilters: (
    | BasicTypeFilter
    | DateTypeFilter
    | SelectTypeFilter
  )[] = [
    {
      name: "dateRange",
      isRequired: true,
      label: "Fecha de facturación",
      type: "datepicker-range",
      datepickerRange: [
        {
          name: "billFrom",
          label: "Desde",
          isUnitlToday: true,
        },
        {
          name: "billTo",
          label: "Hasta",
          isUnitlToday: true,
        },
      ],
    },
    {
      type: "multiselect",
      name: "status",
      label: "Estado",
      data: orderStateSelector,
    },
    {
      type: "select",
      name: "areaId",
      label: "Área",
      data: areaSelector,
    },
  ];

  useEffect(() => {
    if (!!filter) {
      getCustomerSumarizeOrder(coupon!.code, filter);
    }
  }, [filter]);

  const subtotal: {
    subtotal: PriceInvoiceInterface[];
    shipping: PriceInvoiceInterface[];
    discounts: PriceInvoiceInterface[];
    total: PriceInvoiceInterface[];
  } = useMemo(() => {
    const subtotal: PriceInvoiceInterface[] = [];
    const shipping: PriceInvoiceInterface[] = [];
    const discounts: PriceInvoiceInterface[] = [];
    const total: PriceInvoiceInterface[] = [];

    customerSumarizeOrders.forEach((item) => {
      item.prices.forEach((elem) => {
        if (elem.amount !== 0) {
          const idx = subtotal.findIndex(
            (sbt) => sbt.codeCurrency === elem.codeCurrency
          );
          if (idx !== -1) {
            const amount = subtotal[idx].amount + elem.amount;
            subtotal.splice(idx, 1, { ...subtotal[idx], amount });
          } else {
            subtotal.push(elem);
          }
        }
      });

      item.shippingPrice.forEach((elem) => {
        if (elem.amount !== 0) {
          const idx = shipping.findIndex(
            (sbt) => sbt.codeCurrency === elem.codeCurrency
          );
          if (idx !== -1) {
            const amount = shipping[idx].amount + elem.amount;
            shipping.splice(idx, 1, { ...shipping[idx], amount });
          } else {
            shipping.push(elem);
          }
        }
      });

      item.discounts.forEach((elem) => {
        if (elem.amount !== 0) {
          const idx = discounts.findIndex(
            (sbt) => sbt.codeCurrency === elem.codeCurrency
          );
          if (idx !== -1) {
            const amount = discounts[idx].amount + elem.amount;
            discounts.splice(idx, 1, { ...discounts[idx], amount });
          } else {
            discounts.push(elem);
          }
        }
      });

      item.total.forEach((elem) => {
        if (elem.amount !== 0) {
          const idx = total.findIndex(
            (sbt) => sbt.codeCurrency === elem.codeCurrency
          );
          if (idx !== -1) {
            const amount = total[idx].amount + elem.amount;
            total.splice(idx, 1, { ...total[idx], amount });
          } else {
            total.push(elem);
          }
        }
      });
    });

    return { subtotal, shipping, discounts, total };
  }, [customerSumarizeOrders]);

  //Table --------------------------------------------------------------
  const tableTitles = ["Cliente", "Subtotal", "Envíos", "Descuentos", "Total"];
  const tableData: DataTableInterface[] = customerSumarizeOrders.map(
    (item) => ({
      payload: {
        Cliente: item.clientName,
        Subtotal: (
          <div className="flex flex-col">
            {item.prices.length !== 0
              ? item.prices.map((elem, idx) => (
                  <p key={idx}>
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </p>
                ))
              : "-"}
          </div>
        ),
        Envíos: (
          <div className="flex flex-col">
            {item.shippingPrice.length !== 0
              ? item.shippingPrice.map((elem, idx) => (
                  <p key={idx}>
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </p>
                ))
              : "-"}
          </div>
        ),
        Descuentos: (
          <div className="flex flex-col">
            {item.discounts.length !== 0
              ? item.discounts.map((elem, idx) => (
                  <p key={idx}>
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </p>
                ))
              : "-"}
          </div>
        ),
        Total: (
          <div className="flex flex-col">
            {item.total.length !== 0
              ? item.total.map((elem, idx) => (
                  <p key={idx}>
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </p>
                ))
              : "-"}
          </div>
        ),
      },
    })
  );

  if (!Object.values(subtotal).every((itm) => itm.length === 0)) {
    tableData.push({
      borderTop: true,
      borderBottom: true,
      payload: {
        Cliente: "Totales",
        Subtotal: (
          <div className="flex flex-col font-semibold">
            {subtotal.subtotal.length !== 0
              ? subtotal.subtotal.map((elem, idx) => (
                  <p key={idx}>
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </p>
                ))
              : "-"}
          </div>
        ),
        Envíos: (
          <div className="flex flex-col font-semibold">
            {subtotal.shipping.length !== 0
              ? subtotal.shipping.map((elem, idx) => (
                  <p key={idx}>
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </p>
                ))
              : "-"}
          </div>
        ),
        Descuentos: (
          <div className="flex flex-col font-semibold">
            {subtotal.discounts.length !== 0
              ? subtotal.discounts.map((elem, idx) => (
                  <p key={idx}>
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </p>
                ))
              : "-"}
          </div>
        ),
        Total: (
          <div className="flex flex-col font-semibold">
            {subtotal.total.length !== 0
              ? subtotal.total.map((elem, idx) => (
                  <p key={idx}>
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </p>
                ))
              : "-"}
          </div>
        ),
      },
    });
  }

  const actions: BtnActions[] = [
    {
      title: "Exportal a excel",
      action: () => setExportModal(true),
      icon: <PiMicrosoftExcelLogo className="text-lg" />,
    },
  ];

  //----------------------------------------------------------------------

  return (
    <div>
      <SearchCriteriaComponent
        filters={availableFilters}
        filterAction={(data: BasicType) => setFilter({ ...data })}
      />
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitles}
        loading={isFetching}
        actions={customerSumarizeOrders.length !== 0 ? actions : undefined}
      />
      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExportModal
            data={customerSumarizeOrders}
            close={() => setExportModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

//==========================================================================

//Export component =========================================================
interface ModalEsport {
  data: CustomerSumarizeOrder[];
  close: Function;
}
const ExportModal = ({ data, close }: ModalEsport) => {
  const { handleSubmit, control } = useForm();

  const dataToExport: Record<string, string | number>[] = (() => {
    const normalized: Record<string, string | number>[] = [];
    data.forEach((item) => {
      const rows = Math.max(
        item.discounts.length,
        item.prices.length,
        item.shippingPrice.length,
        item.total.length
      );

      for (let index = 0; index < rows; index++) {
        normalized.push({
          Cliente: item.clientName,
          Descuentos: item.discounts[index]?.amount ?? "-",
          "Moneda descuento": item.discounts[index]?.codeCurrency ?? "-",
          "Precio de venta": item.prices[index]?.amount ?? "-",
          "Moneda de venta": item.prices[index]?.codeCurrency ?? "-",
          "Precio de envío": item.shippingPrice[index]?.amount ?? "-",
          "Moneda de envío": item.shippingPrice[index]?.codeCurrency ?? "-",
          Totales: item.total[index]?.amount ?? "-",
          Monedas: item.total[index]?.codeCurrency ?? "-",
        });
      }
    });

    return normalized;
  })();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportExcel(dataToExport, data.name);
    close();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input name="name" control={control} label="Nombre de archivo .xls" />
      <div className="flex justify-end py-5">
        <Button name="Aceptar" color="slate-600" type="submit" />
      </div>
    </form>
  );
};

//==========================================================================

export default SumaryContainer;
