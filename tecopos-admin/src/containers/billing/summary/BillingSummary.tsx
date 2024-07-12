import { useEffect, useState } from 'react'
import Breadcrumb from '../../../components/navigation/Breadcrumb'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { useServerBilling } from '../../../api/useServerBilling'
import TotalAmountBreakdown from './graphics/TotalAmountBreakdown'
import TotalSales from './graphics/TotalSales'
import NumberOfRecordsByState from './graphics/NumberOfRecordsByState'
import PercentOfRegistrationsByState from './graphics/PercentOfRegistrationsByState'
import InvoicesByStatus from './graphics/InvoicesByStatus'
import AdvancePaymentsByState from './graphics/AdvancePaymentsByState'
import TopComercials from './graphics/TopComercials'
import NumberofRecordsbyMonthType from './graphics/NumberofRecordsbyMonthType'
import TopClientsWithMostOrders from './graphics/TopClientsWithMostOrders'
import TopProducts from './graphics/TopProducts'
import PaymentsbyMethod from './graphics/PaymentsbyMethod'
import RecordsbySource from './graphics/RecordsbySource'
import PaymentsbyCurrency from './graphics/PaymentsbyCurrency'
import LoadingSpin from '../../../components/misc/LoadingSpin'
import ADIT from './graphics/ADIT'

const BillingSummary = () => {

  const { AllSummaryOrders, GetAllSummaryOrders } = useServerBilling()

  useEffect(() => {
    GetAllSummaryOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
  }, [AllSummaryOrders])


  return (
    <div>
      {AllSummaryOrders === undefined
        ? <LoadingSpin color='black' />
        : <div className='w-full'>
          <Breadcrumb
            icon={<ClipboardDocumentListIcon className="h-6 text-gray-500" />}
            paths={[{ name: "Facturación" }, { name: "Resumen" }]}
          />

          <div className='flex flex-row md:flex-col w-full gap-y-4'>
            <ADIT AllSummaryOrders={AllSummaryOrders} />

            <div className='flex w-full gap-x-4'>

              <div className='w-[40%] bg-white p-2 rounded-xl '>
                {/* Desglose de importe total */}
                <TotalAmountBreakdown />
                {/* Pendiente y Pagado (Pendiente) */}
              </div>
              <div className='w-[60%] bg-white p-2 rounded-xl  '>
                {/* Ventas Totales */}
                {/* TotalSales */}
                {/* Importe y Pagado (Pendiente) */}
                <TotalSales salesByMonthInMainCurrency={AllSummaryOrders?.salesByMonthInMainCurrency ?? []} />
              </div>
            </div>


            <div className='flex w-full gap-x-4'>

              <div className='w-[60%] bg-white p-2 rounded-xl'>
                {/* Cantidad de Registros por Estado */}
                {/* orderByStatus */}
                <NumberOfRecordsByState orderByStatus={AllSummaryOrders?.orderByStatus!} />
              </div>
              <div className='w-[40%] bg-white p-2 rounded-xl'>
                {/* % de Registros por Tipo */}
                {/* ordersByResumeType */}
                <PercentOfRegistrationsByState ordersByResumeType={AllSummaryOrders?.ordersByResumeType!} />
              </div>
            </div>

            <div className="flex w-full gap-x-4" >
              <div className='w-full bg-white p-2 rounded-xl'>
                {/* Facturas por estado */}
                {/* ordersByResumeStatusPay */}
                {/* ordersByResumeType */}
                <InvoicesByStatus orderByStatus={AllSummaryOrders?.orderByStatus!} />
              </div>
              {/* <div className='w-full bg-white p-2 rounded-xl'> */}
              {/* PreFacturas por estado */}
              {/* <PreInvoicesByStatus />
              </div> */}
              <div className='w-full bg-white p-2 rounded-xl'>
                {/* Pagos Anticipados por estado */}
                <AdvancePaymentsByState prepaidByStatus={AllSummaryOrders?.prepaidByStatus!}/>
              </div>
            </div>


            <div className='flex w-full gap-x-4'>

              <div className='w-[40%] bg-white p-2 rounded-xl'>
                {/* Top 10 comerciales */}
                {/* topsSellers*/}
                <TopComercials topsSellers={AllSummaryOrders?.topsSellers!} />
              </div>
              <div className='w-[60%] bg-white p-2 rounded-xl'>
                {/* Cantidad de registros por tipo de mes */}
                {/* orderByMonth */}
                <NumberofRecordsbyMonthType orderByMonth={AllSummaryOrders?.orderByMonth!} />
              </div>
            </div>

            <div className='flex w-full gap-x-4'>

              <div className='w-[50%] bg-white p-2 rounded-xl'>
                {/* Top 10 clientes */}
                {/* clientsWithMostOrders */}
                <TopClientsWithMostOrders ordersByClient={AllSummaryOrders?.ordersByClient!} />
              </div>
              {/* <div className='w-[50%] bg-white p-2 rounded-xl'>
                <TopClientsWithHighestSpending clientsWithHighestSpending={AllSummaryOrders?.clientsWithHighestSpending!}/>
              </div> */}
              <div className='w-[50%] bg-white p-2 rounded-xl '>
                {/* Top 10 productoss */}
                {/* topValueProducts */}
                <TopProducts topsProductOrder={AllSummaryOrders?.topsProductOrder!} />
              </div>
            </div>

            <div className="flex w-full gap-x-4">
              <div className='w-full bg-white p-2 rounded-xl'>
                {/* Pagos por Metodos */}
                {/* ordersByPaymentWay */}
                <PaymentsbyMethod ordersByPaymentWay={AllSummaryOrders?.ordersByPaymentWay!} />
              </div>
              <div className='w-full bg-white p-2 rounded-xl'>
                {/* Pagos por Moneda */}
                {/* ordersByCurrency */}
                <PaymentsbyCurrency ordersByCurrency={AllSummaryOrders?.ordersByCurrency!} />
              </div>
              <div className='w-full bg-white p-2 rounded-xl'>
                {/* Pagos por Origen */}
                {/* ordersByOrigin */}
                <RecordsbySource ordersByOrigin={AllSummaryOrders?.ordersByOrigin!} />
              </div>
            </div>
          </div>


        </div>
      }
    </div>
  )
}

export default BillingSummary
