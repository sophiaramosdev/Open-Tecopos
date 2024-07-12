import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import { useAppSelector } from "../../store/hooks";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { HomeModernIcon } from "@heroicons/react/24/outline";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import { BsCashCoin, BsCreditCard, BsFiletypeXlsx } from "react-icons/bs";
import Modal from "../../components/misc/GenericModal";
import PosOrderDetails from "./orders/PosOrderDetails";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../components/forms/Input";
import Button from "../../components/misc/Button";
import SearchCriteriaComponent, {
  BasicTypeFilter,
  DateTypeFilter,
  SelectTypeFilter,
} from "../../components/misc/SearchCriteriaComponent";
import { formatCurrency } from "../../utils/helpers";
import {
  CurrenciesPaymentInterface,
  PriceInterface,
  PriceInvoiceInterface,
} from "../../interfaces/ServerInterfaces";

const OrdersSummary = () => {
  const { ecoCycleId } = useParams();
  const { getAllOrdesV1, allOrdes, isLoading, updateAllOrderState } =
    useServerEcoCycle();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const [filter, setFilter] = useState<BasicType>({});
  const [detailOrderModal, setDetailOrderModal] = useState<{
    state: boolean;
    orderId?: number;
  }>({ state: false });
  const { business } = useAppSelector((state) => state.init);

  const [exportModal, setExportModal] = useState(false);

  useEffect(() => {
    if (Object.keys(filter).length) {
      getAllOrdesV1({
        ...filter,
        economicCycleId: ecoCycleId ?? null,
        all_data: true,
      });
    } else {
      getAllOrdesV1({});
    }
  }, [filter]);

  //Data for generic Table-------------------------------------------------------------------
  const tableTitles: string[] = [
    "No. Orden/Factura",
    "Importe",
    "Costo",
    "Envío",
    "Descuentos",
    "Total a pagar",
    "Total pagado",
    "",
  ];

  const subtotal: {
    subtotal: PriceInterface[];
    costo: PriceInvoiceInterface;
    shipping: PriceInvoiceInterface[];
    discounts: PriceInvoiceInterface[];
    total: PriceInvoiceInterface[];
    payment: CurrenciesPaymentInterface[];
  } = useMemo(() => {
    const subtotal: PriceInterface[] = [];
    let costo: PriceInvoiceInterface = {
      amount: 0,
      codeCurrency: business?.costCurrency ?? "CUP",
    };
    const shipping: PriceInvoiceInterface[] = [];
    const discounts: PriceInvoiceInterface[] = [];
    const total: PriceInvoiceInterface[] = [];
    const payment: CurrenciesPaymentInterface[] = [];

    allOrdes.forEach((item) => {
      //Price------
      item?.prices?.forEach((elem) => {
        if (elem.price !== 0) {
          const idx = subtotal.findIndex(
            (sbt) => sbt.codeCurrency === elem.codeCurrency
          );
          if (idx !== -1) {
            const price = subtotal[idx].price + elem.price;
            subtotal.splice(idx, 1, { ...subtotal[idx], price });
          } else {
            subtotal.push(elem);
          }
        }
      });
      //Cost
      if (item.totalCost) {
        costo = { ...costo, amount: costo.amount + item.totalCost };
      }
      //-Shipping
      if (!!item.shippingPrice) {
        const idx = shipping.findIndex(
          (itm) => itm.codeCurrency === item.shippingPrice.codeCurrency
        );
        if (idx !== -1) {
          const amount = shipping[idx].amount + item.shippingPrice.amount;
          shipping.splice(idx, 1, { ...shipping[idx], amount });
        } else {
          shipping.push(item.shippingPrice);
        }
      }
      //Discounts ----------------------------------
      if (item.discount !== 0) {
        item.prices.forEach((price) => {
          const idx = discounts.findIndex(
            (itm) => itm.codeCurrency === price.codeCurrency
          );
          if (idx !== -1) {
            const amount =
              discounts[idx].amount + (item.discount / 100) * price.price;
            discounts.splice(idx, 1, {
              ...discounts[idx],
              amount,
            });
          } else {
            discounts.push({
              amount: price.price*(item.discount / 100),
              codeCurrency: price.codeCurrency,
            });
          }
        });
      }

      if (item?.couponDiscountPrice) {
        const idx = discounts.findIndex(
          (itm) => itm.codeCurrency === item.couponDiscountPrice.codeCurrency
        );
        if (idx !== -1) {
          const amount =
            discounts[idx].amount + item.couponDiscountPrice.amount;
          discounts.splice(idx, 1, {
            ...discounts[idx],
            amount,
          });
        } else {
          discounts.push({
            amount: item.couponDiscountPrice.amount,
            codeCurrency: item.couponDiscountPrice.codeCurrency,
          });
        }
      }

      //--------------------------------------------------------

      //Total to pay---
      item.totalToPay.forEach((elem) => {
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

      //Payment ---
      item.currenciesPayment.forEach((elem) => {
        if (elem.amount !== 0) {
          const idx = payment.findIndex(
            (sbt) =>
              sbt.codeCurrency === elem.codeCurrency &&
              sbt.paymentWay === elem.paymentWay
          );
          if (idx !== -1) {
            const amount = payment[idx].amount + elem.amount;
            payment.splice(idx, 1, { ...payment[idx], amount });
          } else {
            payment.push(elem);
          }
        }
      });
    });

    return { subtotal, costo, shipping, discounts, total, payment };
  }, [allOrdes]);

  const tableData: DataTableInterface[] = allOrdes.map((item) => ({
    payload: {
      "No. Orden/Factura": item.operationNumber,
      Importe: (
        <div className="flex flex-col">
          {item.prices.length !== 0
            ? item.prices.map((elem, idx) => (
                <p key={idx}>{formatCurrency(elem.price, elem.codeCurrency)}</p>
              ))
            : "-"}
        </div>
      ),
      Costo: formatCurrency(item.totalCost, business?.costCurrency),
      Envío: (
        <div className="flex flex-col">
          {item.shippingPrice ? (
            <p>
              {formatCurrency(
                item.shippingPrice.amount,
                item.shippingPrice.codeCurrency
              )}
            </p>
          ) : (
            "-"
          )}
        </div>
      ),
      Descuentos: (
        <div className="flex flex-col">
          {item.discount || item?.couponDiscountPrice ? (
            <>
              {item.prices.map((price, idx) => {
                if (
                  item.couponDiscountPrice?.codeCurrency === price.codeCurrency
                ) {
                  return (
                    <p key={idx}>
                      {formatCurrency(
                        price.price * (item.discount / 100) +
                          item.couponDiscountPrice.amount
                      )}
                    </p>
                  );
                }
                return (
                  <p key={idx}>
                    {formatCurrency(price.price * (item.discount / 100))}
                  </p>
                );
              })}
            </>
          ) : (
            "-"
          )}
        </div>
      ),
      "Total a pagar": (
        <div className="flex flex-col">
          {item.totalToPay.length !== 0
            ? item.totalToPay.map((elem, idx) => (
                <p key={idx}>
                  {formatCurrency(elem.amount, elem.codeCurrency)}
                </p>
              ))
            : "-"}
        </div>
      ),
      "Total pagado": (
        <div className="flex flex-col">
          {item.currenciesPayment.length !== 0
            ? item.currenciesPayment.map((elem, idx) => (
                <div key={idx} className="h-6">
                  <p>{formatCurrency(elem.amount, elem.codeCurrency)}</p>
                </div>
              ))
            : "-"}
        </div>
      ),
      "": (
        <div className="flex flex-col">
          {item.currenciesPayment.length !== 0
            ? item.currenciesPayment.map((elem, idx) => (
                <div key={idx} className="h-6">
                  {elem.paymentWay === "CASH" && (
                    <BsCashCoin className="text-lg text-gray-500" />
                  )}
                  {elem.paymentWay === "TRANSFER" && (
                    <BsCreditCard className="text-lg text-gray-500" />
                  )}
                </div>
              ))
            : "-"}
        </div>
      ),
    },
  }));

  tableData.length &&
    tableData.push({
      rowId: "totals",
      borderTop: true,
      borderBottom: true,
      payload: {
        "No. Orden": <p className="font-semibold">Total</p>,
        Importe:
          subtotal.subtotal.length !== 0 ? (
            <div className="flex flex-col font-semibold">
              {subtotal.subtotal.map((elem, idx) => (
                <p key={idx}>{formatCurrency(elem.price, elem.codeCurrency)}</p>
              ))}
            </div>
          ) : (
            "-"
          ),
        Costo:
          subtotal.costo.amount !== 0 ? (
            <p className="font-semibold">
              {formatCurrency(
                subtotal.costo.amount,
                subtotal.costo.codeCurrency
              )}
            </p>
          ) : (
            "-"
          ),
        Envío:
          subtotal.shipping.length !== 0 ? (
            <div className="flex flex-col font-semibold">
              {subtotal.shipping.map((elem, idx) => (
                <p key={idx}>
                  {formatCurrency(elem.amount, elem.codeCurrency)}
                </p>
              ))}
            </div>
          ) : (
            "-"
          ),
        Descuentos: (
          <div className="flex flex-col font-semibold">
            {subtotal.discounts.map((elem, idx) => (
              <p key={idx}>{formatCurrency(elem.amount, elem.codeCurrency)}</p>
            ))}
          </div>
        ),
        "Total a pagar":
          subtotal.total.length !== 0 ? (
            <div className="flex flex-col font-semibold">
              {subtotal.total.map((elem, idx) => (
                <p key={idx}>
                  {formatCurrency(elem.amount, elem.codeCurrency)}
                </p>
              ))}
            </div>
          ) : (
            "-"
          ),
        "Total pagado": (
          <div className="flex flex-col">
            {subtotal.payment.length !== 0
              ? subtotal.payment.map((elem, idx) => (
                  <div key={idx} className="h-6">
                    <p>{formatCurrency(elem.amount, elem.codeCurrency)}</p>
                  </div>
                ))
              : "-"}
          </div>
        ),
        "": (
          <div className="flex flex-col">
            {subtotal.payment.length !== 0
              ? subtotal.payment.map((elem, idx) => (
                  <div key={idx} className="h-6">
                    {elem.paymentWay === "CASH" && (
                      <BsCashCoin className="text-lg text-gray-500" />
                    )}
                    {elem.paymentWay === "TRANSFER" && (
                      <BsCreditCard className="text-lg text-gray-500" />
                    )}
                  </div>
                ))
              : "-"}
          </div>
        ),
      },
    });

  const actions: BtnActions[] = [
    {
      title: "Exportar a Excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  //------------------------------------------------------------------------
  //Management filters------------------------------------------------------
  const salesAreas = areas
    .filter((item) => item.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const ordertatus: SelectInterface[] = [
    { id: "CREATED", name: "Creada" },
    { id: "IN_PROCESS", name: "En proceso" },
    { id: "BILLED", name: "Facturada" },
    { id: "CANCELLED", name: "Cancelada" },
    { id: "CLOSED", name: "Cerrada" },
    { id: "COMPLETED", name: "Completada" },
  ];
  const paymentMethods: SelectInterface[] = [
    { id: "CASH", name: "Efectivo" },
    { id: "TRANSFER", name: "Transferencia" },
  ];
  const availableFilters: (
    | BasicTypeFilter
    | DateTypeFilter
    | SelectTypeFilter
  )[] = [];
  availableFilters.push(
    {
      type: "input",
      name: "discount",
      label: "% descuento",
    },
    {
      type: "select",
      name: "areaSalesId",
      label: "Punto de venta",
      data: salesAreas,
    },
    {
      type: "select",
      name: "status",
      label: "Estado de la orden",
      data: ordertatus,
    },
    {
      type: "multiselect",
      name: "paymentWay",
      label: "Método de pago",
      data: paymentMethods,
    },
    {
      type: "boolean",
      name: "houseCosted",
      label: "Consumo casa",
      icon: <HomeModernIcon className="h-5 text-green-600" />,
    },
    {
      type: "boolean",
      name: "hasDiscount",
      label: "Descuento",
    },
    {
      type: "boolean",
      name: "modifiedPrice",
      label: "Precios modificados",
    },
    {
      type: "select",
      name: "shippingById",
      label: "Repartidor",
      asyncData: {
        url: "/shipping/deliverers",
        idCode: "id",
        dataCode: "displayName",
      },
    }
  );

  //--------------------------------------------------------------------------------------------------------

  return (
    <>
      <SearchCriteriaComponent
        filters={availableFilters}
        filterAction={(data: BasicType) => setFilter({ ...data })}
      />
      <GenericTable
        actions={actions}
        tableTitles={tableTitles}
        tableData={tableData}
        loading={isLoading}
      />

      {detailOrderModal.state && (
        <Modal
          state={detailOrderModal.state}
          close={() => setDetailOrderModal({ state: false })}
          size="l"
        >
          <PosOrderDetails
            id={detailOrderModal.orderId}
            updState={updateAllOrderState}
          />
        </Modal>
      )}

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            filter={{
              ...filter,
              economicCycleId: ecoCycleId ?? null,
              all_data: true,
            }}
            closeModal={() => setExportModal(false)}
          />
        </Modal>
      )}
    </>
  );
};

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
}

const ExcelFileExport = ({ filter, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportOrdersCycle, isLoading } = useServerEcoCycle();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportOrdersCycle({
      ...filter,
      all_data: true
    }, data.name, closeModal());
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        name="name"
        label="Nombre del archivo"
        placeholder="Nombre del archivo .xlsx"
        control={control}
        rules={{ required: "Debe indicar un nombre para el archivo" }}
      />
      <div className="flex py-2 justify-end">
        <Button
          type="submit"
          name="Exportar"
          color="slate-600"
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </form>
  );
};

export default OrdersSummary;
