/* eslint-disable react-hooks/exhaustive-deps */
import { useParams } from "react-router-dom";
import GenericTable, { DataTableInterface, FilterOpts } from "../misc/GenericTable";
import { getColorCashOperation } from "../../utils/tailwindcss";
import { getCashOperationSpanish, printPriceWithCommasAndPeriods } from "../../utils/functions";
import moment from "moment";
import Paginate from "../misc/Paginate";
import { useEffect, useState } from "react";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import { useServer } from "../../hooks";
import Modal from "../misc/GenericModal";
import PosOrderDetails from "../../containers/economicCycles/orders/PosOrderDetails";
import { FaPrint } from "react-icons/fa";
import { useAppSelector } from "../../store/hooks";
import { PrintCashOperationTicket } from "./PrintCashOperationTicket";
import { EconomicCycle } from "../../interfaces/Interfaces";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface CashOperationInterface {
  ecoCycle: EconomicCycle | null;
}

const CashOperation = ({ ecoCycle }: CashOperationInterface) => {

  const { rollSize } = useAppSelector((state) => state.session);
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { business } = useAppSelector((state) => state.init);

  const {
    isLoading,
    cashOperation,
    findAllCashOperation,
    paginate
  } = useServer({ startLoading: false });

  const [productInfoModal, setProductInfoModal] = useState<any>(null)

  const [filter, setFilter] = useState<
    Record<string, string | number | boolean | null>
  >();
  // >({ page: 1 });

  const { ecoCycleId: id } = useParams();

  useEffect(() => {
    findAllCashOperation(id, filter);
  }, []);

  useEffect(() => {
    id && findAllCashOperation(id, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);


  const tableTitles = [
    "No. de operación",
    "No. de orden",
    "Nombre",
    "Operación",
    "Monto",
    "Fecha/Hora",
    "Observaciones",
  ];

  const tableData: DataTableInterface[] = [];
  cashOperation.forEach((item: any) => {
    tableData.push({
      rowId: item,
      payload: {
        "No. de operación": item?.operationNumber ?? "-",
        "No. de orden": item?.orderReceipt?.operationNumber ?? "-",
        "Nombre": <div className="font-medium text-gray-900">
          {item.madeBy?.displayName ?? ""}
        </div>,
        "Operación": <div className="whitespace-nowrap text-center text-gray-500">
          <div
            className={classNames(
              getColorCashOperation(item.operation),
              "inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium "
            )}
          >
            {getCashOperationSpanish(item.operation)}
          </div>
        </div>,
        "Monto": <div className="whitespace-nowrap text-center text-gray-500">
          {printPriceWithCommasAndPeriods(item.amount) + " " + item.codeCurrency}
        </div>,
        "Fecha/Hora": <div className="whitespace-nowrap text-center text-sm text-gray-500">
          {moment(item.createdAt).format("hh:mm A")}
        </div>,
        "Observaciones": <div className="text-gray-500 text-start">
          {item.observations}
        </div>,
      },
    });
  })

  //Filters-----------------------------------------------------------------------------
  const areasSelector: SelectInterface[] = areas.map(item => ({ id: item.id, name: item.name }))

  // Currencies
  const currenciesList: SelectInterface[] | [] = business
    ? business?.availableCurrencies?.map((currency) => ({
      id: currency.code,
      name: currency.code,
    }))
    : [];

  const availableFilters: FilterOpts[] = [
    {
      format: "boolean",
      filterCode: "fullOperations",
      name: "Incluir todas las operaciones",
    },
    /* {
      format: "multiselect",
      filterCode: "type",
      name: "Tipo de operación",
      data: [
        { name: getCashOperationSpanish("MANUAL_WITHDRAW"), id: "MANUAL_WITHDRAW" },
        { name: getCashOperationSpanish("MANUAL_DEPOSIT"), id: "MANUAL_DEPOSIT" },
        { name: getCashOperationSpanish("MANUAL_FUND"), id: "MANUAL_FUND" },
        { name: getCashOperationSpanish("DEPOSIT_EXCHANGE"), id: "DEPOSIT_EXCHANGE" },
        { name: getCashOperationSpanish("WITHDRAW_EXCHANGE"), id: "WITHDRAW_EXCHANGE" },
        { name: getCashOperationSpanish("WITHDRAW_SALE"), id: "WITHDRAW_SALE" },
        { name: getCashOperationSpanish("WITHDRAW_SHIPPING_PRICE"), id: "WITHDRAW_SHIPPING_PRICE" },
        { name: getCashOperationSpanish("DEPOSIT_SALE"), id: "DEPOSIT_SALE" },
        { name: getCashOperationSpanish("DEPOSIT_TIP"), id: "DEPOSIT_TIP" },
      ],
    }, */
    {
      format: "select",
      name: "Área",
      filterCode: "areaId",
      data: areasSelector,
    },
    {
      format: "select",
      filterCode: "madeById",
      name: "Realizado por",
      asyncData: {
        url: "/security/users",
        idCode: "id",
        dataCode: ["displayName", "email", "username"],
      },
    },
    {
      format: "select",
      name: "Moneda",
      filterCode: "codeCurrency",
      data: currenciesList,
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...data }) : setFilter({ page: 1 });
  };

  const rowAction = (item: any) => {
    setProductInfoModal(item?.orderReceipt?.id)
  };

  const tableActions = [
    {
      title: "Imprimir ticket",
      icon: <FaPrint className="h-5" />,
      action: () => {
        PrintCashOperationTicket({ cashOperation, ecoCycle, rollSize });
      },
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mt-8 flex flex-col">
        <GenericTable
          tableTitles={tableTitles}
          tableData={tableData}
          rowAction={rowAction}
          loading={isLoading}
          paginateComponent={
            <Paginate
              action={(page: number) => setFilter({ ...filter, page })}
              data={paginate}
            />
          }
          filterComponent={{ availableFilters, filterAction }}
          actions={tableActions}
        />
      </div>

      {productInfoModal && (
        <Modal state={!!productInfoModal} close={() => setProductInfoModal(null)} size="l">
          <PosOrderDetails
            id={productInfoModal}
            updState={() => { }}
          />
        </Modal>
      )}
    </div>
  );
}

export default CashOperation
