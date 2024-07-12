import React from 'react'

const ADIT = ({ AllSummaryOrders }: { AllSummaryOrders: any }) => {
  // totalIncomes
  // totalDiscounts

  // Incremento Pendiente

  // totalIncomesInMainCurrency

  const ADIT = [
    {
      text: "Importe base",
      quantity: (AllSummaryOrders?.totalIncomes[0]?.amount).toFixed(2) ?? 0,
    },
    {
      text: "Rebaja",
      quantity: AllSummaryOrders?.totalDiscounts?.find((e: { codeCurrency: string }) => e.codeCurrency === "CUP")?.amount.toFixed(2) ?? 0,
    },
    {
      text: "Incremento",
      quantity: AllSummaryOrders?.totalCost?.amount.toFixed(2) ?? 0,
    },
    {
      text: "Importe total",
      quantity: AllSummaryOrders?.totalIncomesInMainCurrency?.amount.toFixed(2) ?? 0,
    }
  ]

  return (
    <div className='flex w-full bg-white p-2 rounded-xl'>
      {/* Importe Base / Rebaja / Icremento / Importe Total */}
      {ADIT.map((elem, key) => (
        <div key={key} className='flex flex-col items-center justify-center w-full'>
          <p className='text-4xl font-thin text-blue-800'>{elem.quantity}</p>
          <p className='text-xl mt-4'>{elem.text}</p>
        </div>
      ))}
    </div>
  )
}

export default ADIT
