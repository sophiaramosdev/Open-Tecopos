import { useContext, useEffect, useState } from "react";
import { DispatchContext } from "../HistoricalDetails";
import { SalaryReportPersons } from "../../../../../interfaces/ServerInterfaces";
import { exportExcel, formatDateForReports, generatePdf, sumCurrencyAmounts, sumarMontos, sumarMontosArr } from "../../../../../utils/helpers";
import { BsFiletypeXlsx } from "react-icons/bs";
import { BtnActions } from "../../../../../components/misc/MultipleActBtn";
import Modal from "../../../../../components/misc/GenericModal";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../../../components/forms/Input";
import Button from "../../../../../components/misc/Button";
import { FaRegFilePdf } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import AllGeneralReport from "../../../../../reports/AllGeneralReport";
import AllGeneralReportSimplify from "../../../../../reports/AllGeneralReportSimlify";
import { setTitlesForExport } from "../../../../../store/slices/nomenclatorSlice";

const Export = (props: any) => {

  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(setTitlesForExport(["Nombre", "Días trabajados", "Total a pagar"]))
  }, [])

  const { titlesForExport } = useAppSelector((state) => state.nomenclator);

  const { business, branches } = useAppSelector((state) => state.init);

  const { HistoricalDetailsData } = useContext(DispatchContext);

  const [exportModal, setExportModal] = useState({
    state: false,
    simplifyng: false
  });

  const selectbranches: SelectInterface[] = [];

  if (branches && branches?.length !== 0) {
    branches?.forEach((item) => {
      selectbranches.push({
        id: item.id,
        name: item.name,
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

  const dataToExport: Record<string, string | number>[] = [];
  const dataToExportSimplify: Record<string, string | number>[] = [];

  HistoricalDetailsData?.salaryReportPersons.forEach((salaryReport: SalaryReportPersons) => {

    const totalOrdersSalesInPOS: any[] = []
    const totalOrdersManaged: any[] = []
    const totalOrdersServed: any[] = []
    const totalProductsProduced: any[] = []
    const totalSales: any[] = []
    const totalReferenceToPay: any[] = []
    const amountFixed: any[] = []

    salaryReport.listEconomicCycles.forEach((ecoCycle) => {
      ecoCycle.totalOrdersSalesInPOS.forEach((order: any) => {
        totalOrdersSalesInPOS.push(order)
      })

      totalOrdersManaged.push(sumCurrencyAmounts(ecoCycle.totalOrdersManaged))

      totalOrdersServed.push(sumCurrencyAmounts(ecoCycle.totalOrdersServed))

      totalProductsProduced.push(sumCurrencyAmounts(ecoCycle.totalProductsProduced))

      totalSales.push(sumCurrencyAmounts(ecoCycle.totalSales))

      totalReferenceToPay.push(sumCurrencyAmounts(ecoCycle.totalReferenceToPay))

      amountFixed.push(ecoCycle.amountFixed)
    })

    //-------------------------------------------
    salaryReport.listEconomicCycles.forEach((ecocycle, indx) => {
      const titulosFiltrados = Object.fromEntries(
        Object.entries({
          "Nombre": indx === 0 ? salaryReport?.person?.firstName + " " + salaryReport?.person?.lastName : "",
          "Cargo": indx === 0 ? salaryReport?.person?.post?.name! : "",
          "Categoría": indx === 0 ? salaryReport?.person?.personCategory?.name! : "",
          "Días trabajados": formatDateForReports(ecocycle.startsAt),
          "Negocio": salaryReport?.person?.business?.name ?? "",

          "Ventas en POS": ecocycle?.totalOrdersSalesInPOS[0]?.amount,
          "Ordenes manejadas": ecocycle.totalOrdersManaged[0]?.amount,
          "Ordenes elaboradas": ecocycle.totalOrdersServed[0]?.amount,
          "Productos producidos": ecocycle.totalProductsProduced[0]?.amount,
          "Total en ventas": ecocycle.totalSales[0]?.amount,
          "Total referencia": ecocycle.totalReferenceToPay[0]?.amount,
          "Salario fijo": Math.round(ecocycle?.amountFixed?.amount),

          "Salario base": Math.round(ecocycle.baseAmount.amount),
          "Horas especiales": Math.round(ecocycle.specialHours.amount),
          "Propinas": Math.round(ecocycle.tips.amount),
          "Extras": Math.round(ecocycle.plusAmount.amount),
          "Firma": "",
          "Total a pagar": Math.round(ecocycle.realToPay.amount),
        })
          .filter(([key]) => titlesForExport.includes(key))
      );
      dataToExport.push(titulosFiltrados)
    })

    //-----------------------------------------------------------
    const titulosFiltrados = Object.fromEntries(
      Object.entries({
        "Nombre": salaryReport.listEconomicCycles.length === 0 ? (salaryReport?.person?.firstName + " " + salaryReport?.person?.lastName) : "",
        "Cargo": salaryReport.listEconomicCycles.length === 0 ? (salaryReport?.person?.post?.name!) : "",
        "Categoría": salaryReport.listEconomicCycles.length === 0 ? (salaryReport?.person?.personCategory?.name!) : "",
        "Días trabajados": salaryReport.listEconomicCycles.length === 0 ? `${salaryReport.listEconomicCycles.length}` : "SUBTOTAL",
        "Negocio": salaryReport?.person?.business?.name ?? "",

        "Ventas en POS": sumarMontosArr(totalOrdersSalesInPOS),
        "Ordenes manejadas": sumarMontosArr(totalOrdersManaged),
        "Ordenes elaboradas": sumarMontosArr(totalOrdersServed),
        "Productos producidos": sumarMontosArr(totalProductsProduced),
        "Total en ventas": sumarMontosArr(totalSales),
        "Total referencia": sumarMontosArr(totalReferenceToPay),
        "Salario fijo": sumarMontos(amountFixed),

        "Salario base": Math.round(salaryReport.baseAmount ?? ""),
        "Horas especiales": Math.round(salaryReport.specialHours ?? ""),
        "Propinas": Math.round(salaryReport.tips ?? ""),
        "Extras": Math.round(salaryReport.plusAmount ?? ""),
        "Firma": "",
        "Total a pagar": Math.round(salaryReport.totalToPay ?? ""),
      })
        .filter(([key]) => titlesForExport.includes(key))
    );
    dataToExport.push(titulosFiltrados)
    dataToExport.push(Object.fromEntries(
      Object.entries({
        "Nombre": "",
        "Cargo": "",
        "Categoría": "",
        "Días trabajados": "",
        "Negocio": "",

        "Ventas en POS": "",
        "Ordenes manejadas": "",
        "Ordenes elaboradas": "",
        "Productos producidos": "",
        "Total en ventas": "",
        "Total referencia": "",
        "Salario fijo": "",

        "Salario base": "",
        "Horas especiales": "",
        "Propinas": "",
        "Extras": "",
        "Firma": "",
        "Total a pagar": "",
      })
        .filter(([key]) => titlesForExport.includes(key))
    ))



    //-----------------------------------------------------------
    const titulosFiltradosSimplify = Object.fromEntries(
      Object.entries({
        "Nombre": salaryReport?.person?.firstName + " " + salaryReport?.person?.lastName,
        "Cargo": salaryReport?.person?.post?.name!,
        "Categoría": salaryReport?.person?.personCategory?.name!,
        "Días trabajados": `${salaryReport.listEconomicCycles.length}`,
        "Negocio": salaryReport?.person?.business?.name ?? "",

        "Ventas en POS": sumarMontosArr(totalOrdersSalesInPOS),
        "Ordenes manejadas": sumarMontosArr(totalOrdersManaged),
        "Ordenes elaboradas": sumarMontosArr(totalOrdersServed),
        "Productos producidos": sumarMontosArr(totalProductsProduced),
        "Total en ventas": sumarMontosArr(totalSales),
        "Total referencia": sumarMontosArr(totalReferenceToPay),
        "Salario fijo": sumarMontos(amountFixed),

        "Salario base": Math.round(salaryReport.baseAmount ?? ""),
        "Horas especiales": Math.round(salaryReport.specialHours ?? ""),
        "Propinas": Math.round(salaryReport.tips ?? ""),
        "Extras": Math.round(salaryReport.plusAmount ?? ""),
        "Firma": "",
        "Total a pagar": Math.round(salaryReport.totalToPay ?? ""),
      })
        .filter(([key]) => titlesForExport.includes(key))
    );
    dataToExportSimplify.push(titulosFiltradosSimplify)
    dataToExportSimplify.push(Object.fromEntries(
      Object.entries({
        "Nombre": "",
        "Cargo": "",
        "Categoría": "",
        "Días trabajados": "",
        "Negocio": "",

        "Ventas en POS": "",
        "Ordenes manejadas": "",
        "Ordenes elaboradas": "",
        "Productos producidos": "",
        "Total en ventas": "",
        "Total referencia": "",
        "Salario fijo": "",

        "Salario base": "",
        "Horas especiales": "",
        "Propinas": "",
        "Extras": "",
        "Firma": "",
        "Total a pagar": "",
      })
        .filter(([key]) => titlesForExport.includes(key))
    ))

  })

  const actions = [
    {
      title: "Exportar nómina a pdf",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => {
        generatePdf(
          //@ts-ignore
          AllGeneralReport({
            data: HistoricalDetailsData?.salaryReportPersons!,
            dateRange: {
              startsAt: HistoricalDetailsData?.startsAt!,
              endsAt: HistoricalDetailsData?.endsAt!
            },
            codeCurrency: HistoricalDetailsData?.codeCurrency!,
            businessName: selectbranches.find(branch => branch.id === HistoricalDetailsData?.businessId)?.name!,
            totalToPay: HistoricalDetailsData?.totalToPay!,
            totalTip: HistoricalDetailsData?.totalTips!,
            titlesForExport: titlesForExport
          })
          ,
          "Reportes Salario"
        )
      }
    },
    {
      title: "Exportar nómina simplificada a pdf",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => {
        generatePdf(
          //@ts-ignore
          AllGeneralReportSimplify({
            data: HistoricalDetailsData?.salaryReportPersons!,
            dateRange: {
              startsAt: HistoricalDetailsData?.startsAt!,
              endsAt: HistoricalDetailsData?.endsAt!
            },
            codeCurrency: HistoricalDetailsData?.codeCurrency!,
            businessName: selectbranches.find(branch => branch.id === HistoricalDetailsData?.businessId)?.name!,
            totalToPay: HistoricalDetailsData?.totalToPay!,
            totalTip: HistoricalDetailsData?.totalTips!,
            titlesForExport: titlesForExport
          })
          ,
          "Reportes Salario simplificado"
        )
      }
    },
    {
      title: "Exportar nómina a excel",
      icon: <BsFiletypeXlsx className="text-base" />,
      action: () => setExportModal({
        state: true,
        simplifyng: false
      })
    },
    {
      title: "Exportar nómina simplificada a excel",
      icon: <BsFiletypeXlsx className="text-base" />,
      action: () => setExportModal({
        state: true,
        simplifyng: true
      })
    },
  ];

  const exportAction = (name: string) => {
    exportExcel(dataToExport, name);
  }

  const exportActionSimplify = (name: string) => {
    exportExcel(dataToExportSimplify, name);
  }

  return (
    <div className={props.show ? '' : 'hidden'}>
      <div className="grid grid-cols-2 gap-1 w-2/3">
        {
          actions.map(action => (
            <div className="flex items-center border-b-2 border-gray-200 bg-white py-2 my-2 cursor-pointer p-2 rounded-lg mx-4"
              onClick={()=>action?.action && action.action()}
            >
              <p className="text-sm mr-2 font-medium text-gray-500">{action.title}</p>
              {action.icon ?? ""}
            </div>
          ))
        }
      </div>


      {(exportModal.state && !exportModal.simplifyng) && (
        <Modal state={exportModal.state} close={setExportModal}>
          <ExportModalContainer
            exportAction={exportAction}
            close={() => setExportModal({
              state: false,
              simplifyng: false
            })}
          />
        </Modal>
      )}

      {(exportModal.state && exportModal.simplifyng) && (
        <Modal state={exportModal.state} close={setExportModal}>
          <ExportModalContainer
            exportAction={exportActionSimplify}
            close={() => setExportModal({
              state: false,
              simplifyng: false
            })}
          />
        </Modal>
      )}
    </div>
  )
}

export default Export


const ExportModalContainer = ({
  exportAction,
  close,
}: {
  exportAction: Function;
  close: Function;
}) => {
  const { control, handleSubmit } = useForm();
  const submit: SubmitHandler<Record<string, string>> = (data) => {
    exportAction(data.name);
    close();
  };
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Input
        name="name"
        control={control}
        label="Nombre del archivo .xlsx"
        rules={{ required: "Requerido *" }}
      />
      <div className="flex justify-end py-2">
        <Button color="slate-600" name="Aceptar" type="submit" />
      </div>
    </form>
  );
};