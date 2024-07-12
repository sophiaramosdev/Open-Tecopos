import { useContext, useState } from "react";
import { DispatchContext } from "../HistoricalDetails";
import GenericTable, { DataTableInterface } from "../../../../../components/misc/GenericTable";
import { formatDate, sumCurrencyAmounts, sumTotalByCurrencyArray } from "../../../../../utils/helpers";
import { printPriceWithCommasAndPeriods } from "../../../../../utils/functions";
import { ExtendedNomenclator, SalaryReportPersons } from "../../../../../interfaces/ServerInterfaces";
import Modal from "../../../../../components/misc/GenericModal";
import EditSalaryReport from "./EditSalaryReport";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../../store/hooks";

const Results = (props: any) => {

  const { business, branches } = useAppSelector((state) => state.init);

  const { HistoricalDetailsData } = useContext(DispatchContext);

  const [orderByName, setOrderByName] = useState(0);
  const [orderByBusinessName, setOrderByBusinessName] = useState(0);
  const [orderByCategory, setOrderByCategory] = useState(0);
  const [orderByPost, setOrderByPost] = useState(0);

  const [openEditModal, setOpenEditModal] = useState<{
    state: boolean;
    rowId: number | null;
  }>({
    state: false,
    rowId: null,
  })

  const selectbranches: SelectInterface[] = [];

  if (branches && branches?.length !== 0) {
    branches?.forEach((item) => {
      selectbranches.push({
        id: item.id,
        name: item?.name,
        disabled: false
      });
    });
  } else {
    selectbranches.push({
      id: business?.id!,
      name: business?.name!,
      disabled: false
    });
  }

  const sortArray = (
    array: SalaryReportPersons[],
    keyGetter: (item: SalaryReportPersons) => string | undefined,
    order: number
  ) => {
    return array?.sort((a, b) => {
      const keyA = keyGetter(a);
      const keyB = keyGetter(b);

      if (keyA !== undefined && keyB !== undefined) {
        return order === 1 ? keyA?.localeCompare(keyB) : order === 2 ? keyB?.localeCompare(keyA) : 0;
      }

      return 0;
    });
  };

  const tableTitles = [
    "Nombre",
    "Categoría",
    "Cargo",
    "Días trabajados",
    "Negocio",
    "Ventas en POS",
    "Ordenes manejadas",
    "Ordenes elaboradas",
    "Productos producidos",
    "Total en ventas",
    "Total referencia",
    "Salario fijo",
    "Salario base",
    "Horas especiales",
    "Propinas",
    "Extras",
    "Observaciones",
    "Total a pagar",
  ];

  const tableData: DataTableInterface[] = [];

  // Uso de la función para ordenar por nombre
  sortArray(HistoricalDetailsData?.salaryReportPersons!, (item) => item?.person?.firstName, orderByName);

  // Uso de la función para ordenar por negocio
  sortArray(HistoricalDetailsData?.salaryReportPersons!, (item) => item?.person?.business?.name, orderByBusinessName);

  // Uso de la función para ordenar por categoría
  sortArray(
    HistoricalDetailsData?.salaryReportPersons!,
    (item) => item.person?.personCategory?.name,
    orderByCategory
  );

  // Uso de la función para ordenar por cargo
  sortArray(HistoricalDetailsData?.salaryReportPersons!, (item) => item?.person?.post?.name, orderByPost);

  HistoricalDetailsData?.salaryReportPersons.forEach((salaryReport: SalaryReportPersons) => {

    const totalOrdersSalesInPOS: any[] = []
    const totalOrdersManaged: any[] = []
    const totalOrdersServed: any[] = []
    const totalProductsProduced: any[] = []
    const totalSales: any[] = []
    const totalReferenceToPay: any[] = []
    const amountFixed: any[] = []
    const baseAmount: any[] = []
    const specialHours: any[] = []
    const plusAmount: any[] = []
    const tips: any[] = []
    const realToPay: any[] = []

    salaryReport.listEconomicCycles.forEach(ecoCycle => {

      ecoCycle.totalOrdersSalesInPOS.forEach((order: any) => {
        totalOrdersSalesInPOS.push(order)
      })

      totalOrdersManaged.push(sumCurrencyAmounts(ecoCycle.totalOrdersManaged))

      totalOrdersServed.push(sumCurrencyAmounts(ecoCycle.totalOrdersServed))

      totalProductsProduced.push(sumCurrencyAmounts(ecoCycle.totalProductsProduced))

      totalSales.push(sumCurrencyAmounts(ecoCycle.totalSales))

      totalReferenceToPay.push(sumCurrencyAmounts(ecoCycle.totalReferenceToPay))

      amountFixed.push(ecoCycle.amountFixed)
      baseAmount.push(ecoCycle.baseAmount)
      specialHours.push(ecoCycle.specialHours)
      plusAmount.push(ecoCycle.plusAmount)
      tips.push(ecoCycle.tips)
      realToPay.push(ecoCycle.realToPay)

    })

    tableData.push({
      rowId: salaryReport.id,
      payload: {
        Aux: salaryReport?.person?.post?.name,
        Nombre: (
          <div className="flex flex-col items-start justify-start">
            <p className="text-black font-semibold">{salaryReport?.person?.firstName + " " + salaryReport?.person?.lastName}</p>
            <p className='whitespace-nowrap text-slate-400'>{salaryReport?.person?.personCategory?.name}</p>
            <p className='whitespace-nowrap text-slate-400'>{salaryReport?.person?.post?.name}</p>
          </div>
        ),
        "Categoría": <p className='whitespace-nowrap'>{salaryReport?.person?.personCategory?.name}</p>,
        "Cargo": <p className='whitespace-nowrap'>{salaryReport?.person?.post?.name}</p>,
        "Días trabajados": "Días trabajados",
        "Negocio": "Negocio",
        "Ventas en POS": "Ventas en POS",
        "Ordenes manejadas": "Ordenes manejadas",
        "Ordenes elaboradas": "Ordenes elaboradas ",
        "Productos producidos": "Productos producidos ",
        "Total en ventas": "Total en ventas ",
        "Total referencia": "Total referencia",
        "Salario fijo": "Salario fijo",
        "Salario base": "Salario base",
        "Horas especiales": "Horas especiales",
        "Extras": "Extras",
        "Propinas": "Propinas ",
        "Total a pagar": "Total a pagar ",
        "Observaciones": "Observaciones ",
      },
      childRows:
        salaryReport.listEconomicCycles.map((child) => ({
          rowId: child.economicCycleId,
          payload: {
            Nombre: " ",
            "Categoría": " ",
            "Cargo": " ",
            "Días trabajados": <p className='whitespace-nowrap'>{formatDate(child.startsAt)}</p>,
            "Negocio": <p className='whitespace-nowrap'>{salaryReport?.person?.business?.name}</p>,
            "Ventas en POS": child.totalOrdersSalesInPOS.map(element => (
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(element.amount) + " " + element.codeCurrency}
              </div>
            )),
            "Ordenes manejadas": child.totalOrdersManaged.map(element => (
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(element.amount) + " " + element.codeCurrency}
              </div>
            )),
            "Ordenes elaboradas": child.totalOrdersServed.map(element => (
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(element.amount) + " " + element.codeCurrency}
              </div>
            )),
            "Productos producidos": child.totalProductsProduced.map((element: any) => (
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(element.amount) + " " + element.codeCurrency}
              </div>
            )),
            "Total en ventas": child.totalSales.map((element: any) => (
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(element.amount) + " " + (element.codeCurrency ?? "")}
              </div>
            )),
            "Total referencia": child.totalReferenceToPay.map((element: any) => (
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(element.amount) + " " + (element.codeCurrency ?? "")}
              </div>
            )),
            "Salario fijo":
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(child?.amountFixed?.amount) + " " + (child?.amountFixed?.codeCurrency ?? "")}
              </div>
            ,
            "Salario base":
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(child?.baseAmount?.amount) + " " + (child?.baseAmount?.codeCurrency ?? "")}
              </div>
            ,
            "Horas especiales":
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(child?.specialHours?.amount) + " " + (child?.specialHours?.codeCurrency ?? "")}
              </div>
            ,
            "Extras":
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(child?.plusAmount?.amount) + " " + (child?.plusAmount?.codeCurrency ?? "")}
              </div>
            ,
            "Propinas":
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(child?.tips?.amount) + " " + (child?.tips?.codeCurrency ?? "")}
              </div>
            ,
            "Total a pagar":
              <div className='whitespace-nowrap'>
                {printPriceWithCommasAndPeriods(child?.realToPay.amount) + " " + (child?.realToPay?.codeCurrency ?? "")}
              </div>
            ,
            "Observaciones": <p className='whitespace-nowrap'>{salaryReport.observations ? salaryReport.observations : "-"}</p>,
          }
        })),
      borderTop: true,
    },
      {
        rowId: salaryReport.id,
        payload: {
          Nombre: <p className='whitespace-nowrap'>Subtotal</p>,
          "Categoría": " ",
          "Cargo": " ",
          "Días trabajados": <p className='whitespace-nowrap'>{salaryReport.listEconomicCycles.length} días</p>,
          "Negocio": <p className='whitespace-nowrap'>{salaryReport?.person?.business?.name}</p>,
          "Ventas en POS": totalOrdersSalesInPOS.map(element => (
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(element.amount) + " " + element.codeCurrency}
            </div>
          )),
          "Ordenes manejadas": sumTotalByCurrencyArray(totalOrdersManaged).map(element => (
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(element.amount) + " " + element.codeCurrency}
            </div>
          )),
          "Ordenes elaboradas": sumTotalByCurrencyArray(totalOrdersServed).map(element => (
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(element.amount) + " " + element.codeCurrency}
            </div>
          )),
          "Productos producidos": sumTotalByCurrencyArray(totalProductsProduced).map((element: any) => (
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(element.amount) + " " + element.codeCurrency}
            </div>
          )),
          "Total en ventas": sumTotalByCurrencyArray(totalSales).map((element: any) => (
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(element.amount) + " " + (element.codeCurrency ?? "")}
            </div>
          )),
          "Total referencia": sumTotalByCurrencyArray(totalReferenceToPay).map((element: any) => (
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(element.amount) + " " + (element.codeCurrency ?? "")}
            </div>
          )),
          //------------------------------------
          "Salario fijo": sumCurrencyAmounts(amountFixed).map((element: any) => (
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(element.amount) + " " + (element.codeCurrency ?? "")}
            </div>
          )),
          //------------------------------------
          "Salario base":
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(salaryReport.baseAmount) + " " + (HistoricalDetailsData.codeCurrency ?? "")}
            </div>
          ,
          "Horas especiales":
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(salaryReport.specialHours) + " " + (HistoricalDetailsData.codeCurrency ?? "")}
            </div>
          ,
          "Extras":
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(salaryReport.plusAmount) + " " + (HistoricalDetailsData.codeCurrency ?? "")}
            </div>
          ,
          "Propinas":
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(salaryReport.tips) + " " + (HistoricalDetailsData.codeCurrency ?? "")}
            </div>
          ,
          "Total a pagar":
            <div className='whitespace-nowrap'>
              {printPriceWithCommasAndPeriods(salaryReport.totalToPay) + " " + (HistoricalDetailsData.codeCurrency ?? "")}
            </div>
          ,
        }
        , boldRow: true
      });
  });

  let availableFiltersByOrder: ExtendedNomenclator[] = [
    {
      id: 1,
      name: "Nombre",
      availableOptions: [{ name: 'A - Z', id: 1 }, { name: 'Z - A', id: 2 }],
      action: (data: number) => data ? setOrderByName(data) : setOrderByName(0),
      reset: () => setOrderByName(0),
    },
    {
      id: 2,
      name: "Negocio",
      availableOptions: [{ name: 'A - Z', id: 1 }, { name: 'Z - A', id: 2 }],
      action: (data: number) => data ? setOrderByBusinessName(data) : setOrderByBusinessName(0),
      reset: () => setOrderByBusinessName(0),
    },
    {
      id: 3,
      name: "Categoría",
      availableOptions: [{ name: 'A - Z', id: 1 }, { name: 'Z - A', id: 2 }],
      action: (data: number) => data ? setOrderByCategory(data) : setOrderByCategory(0),
      reset: () => setOrderByCategory(0),
    },
    {
      id: 4,
      name: "Cargo",
      availableOptions: [{ name: 'A - Z', id: 1 }, { name: 'Z - A', id: 2 }],
      action: (data: number) => data ? setOrderByPost(data) : setOrderByPost(0),
      reset: () => setOrderByPost(0),
    },
  ]

  const rowAction = (rowId: number) => {
    setOpenEditModal({
      state: true,
      rowId: rowId,
    })
  };

  const childRowAction = (childRowId: number, rowId: number) => {
    setOpenEditModal({
      state: true,
      rowId: rowId,
    })
  };


  return (
    <div className={props.show ? '' : 'hidden'}>
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitles}
        childRowAction={childRowAction}
        rowAction={rowAction}
        childRowsAlwaysActive={true}
        genericTableHeigth96={true}
        orderBy={{ availableFilters: availableFiltersByOrder }}
        showSpecificColumns={true}
      />

      {
        openEditModal.state && (
          <Modal state={openEditModal.state} close={() => setOpenEditModal({
            state: false,
            rowId: null
          })}>
            <EditSalaryReport salaryReportId={openEditModal.rowId!} closeModal={() => setOpenEditModal({
              state: false,
              rowId: null
            })} />
          </Modal>
        )
      }

    </div>
  )
}

export default Results

