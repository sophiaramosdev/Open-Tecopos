import React from "react";

const ADIT = ({ AllSummaryOrders }: { AllSummaryOrders: any }) => {
 
  const ADIT = [
    {
      text: "Total de clientes",
      quantity: 30,
    },
    {
      text: "Total de reservaciones",
      quantity:1000,
    },
    {
      text: "Total de ingresos",
      quantity: `25000 CUP`,
    },
  ];

  return (
    <div className="flex w-full gap-x-5 bg-white p-2 rounded-xl">
      {ADIT.map((elem, key) => (
        <article
          key={key}
          className="flex flex-col justify-center w-full  border rounded-md border-gray-300 border-opacity-90 p-3 px-4 "
        >
          <p className="text-xl mb-1 font-semibold text-gray-500">
            {elem.text}
          </p>
          <p className="text-3xl font-semibold text-black text-opacity-90">{elem.quantity}</p>
        </article>
      ))}
    </div>
  );
};

export default ADIT;
