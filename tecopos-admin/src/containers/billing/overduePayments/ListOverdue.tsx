import { useContext, useEffect, useState } from "react";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import Paginate from "../../../components/misc/Paginate";
import { formatCurrency, formatDateForTable } from "../../../utils/helpers";
import { FaClipboard, FaMoneyBill, FaRegFileExcel } from "react-icons/fa";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import { translateOrderOrigin } from "../../../utils/translate";
import { printPriceWithCommasAndPeriods } from "../../../utils/functions";
import { ListOverdueContext } from "./OverduePayments";
import moment from "moment";
import Fetching from "../../../components/misc/Fetching";

interface Props {
  close?: Function;
  action?: Function;
  id: number | null;
}

const ListOverdue = ({ close, id, action }: Props) => {
  const {
    getAllRegisterBillingList,
    isFetching,
    isLoading,
    registerBillingList,
    registerPaginate,
  } = useContext(ListOverdueContext);

  const [filter, setFilter] = useState<BasicType>({
    clientId: id,
    status: "OVERDUE",
    isPreReceipt: null,
  });

  const [fetchingAux,setFetchingAux] = useState(true)

  useEffect(() => {
    if(isFetching){
      setFetchingAux(false)
    }
  }, [isFetching])
  useEffect(() => {
    getAllRegisterBillingList!(filter);
  }, [filter]);

  const tableTitle = [
    "Tipo",
    "No.",
    "Cliente",
    "Estado",
    "Emisión",
    "Origen",
    "Importe",
  ];

  const tableData: DataTableInterface[] = [];
  registerBillingList &&
    registerBillingList?.map((item) => {
      tableData.push({
        rowId: item.id,
        payload: {
          Tipo: (
            <div className="flex justify-start flex-row">
              {!item?.isPreReceipt ? (
                <div className="flex gap-2">
                  <FaMoneyBill size={20} className="text-green-500" />
                  <p>Factura</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <FaClipboard size={20} className="text-amber-500" />
                  <p>Pre-Factura</p>
                </div>
              )}
            </div>
          ),
          "No.": (
            <div className="flex justify-start">
              {item?.isPreReceipt
                ? `${moment(item.createdAt).get("year")}/${
                    item.preOperationNumber
                  }`
                : `${moment(item.createdAt).get("year")}/${
                    item.operationNumber
                  }`}
            </div>
          ),
          Cliente: (
            <div className="flex justify-start flex-row">
              {item.client?.firstName} {item.client?.lastName}
            </div>
          ),
          Estado: (
            <div className="flex flex-col">
              {
                <div>
                  <OrderStatusBadge status={item?.status} />
                </div>
              }
            </div>
          ),
          Emisión: (
            <div className="flex flex-col">
              {formatDateForTable(item?.createdAt)}
            </div>
          ),
          Origen: (
            <div className="flex flex-col">
              {translateOrderOrigin(item?.origin)}
            </div>
          ),
          Importe: (
            <p className="flex flex-col">
              {item?.totalToPay.map((ele) => (
                <p key={ele?.amount}>
                  <span className="text-sm">
                    {formatCurrency(ele.amount, ele.codeCurrency)}
                  </span>{" "}
                </p>
              ))}
            </p>
          ),
        },
      });
    });

  const tableActions = [
    {
      title: "Exportar a Excel",
      icon: <FaRegFileExcel className="h-5 text-gray-500" />,
      // action: () => setExportModal(true),
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter(filter);
  };

  if (isFetching || fetchingAux)
    return (
      <div className="h-[400px]">
        <Fetching />
      </div>
    );

  return (
    <section className=" max-h-[400px] overflow-y-auto">
      <header>{/* <h1>Facturas vencidas</h1> */}</header>
      <article>
        <GenericTable
          tableTitles={tableTitle}
          tableData={tableData}
          //actions={tableActions}
          rowAction={action && action}
          loading={isFetching}
          //filterComponent={{ availableFilters, filterAction }}
          paginateComponent={
            <Paginate
              action={(page: number) => setFilter({ ...filter, page })}
              data={registerPaginate}
            />
          }
        />
      </article>
    </section>
  );
};
export default ListOverdue;
