import React from "react";
import Chart from "react-apexcharts";
import { DocumentDuplicateIcon, ClockIcon } from "@heroicons/react/24/outline";
import { MonthOrder } from "../../../../interfaces/ServerInterfaces";

const NextAppointments = ({ orderByMonth }: { orderByMonth: MonthOrder[] }) => {
  return (
    <div>
      <header className="w-full flex items-center mb-5">
        <p className="w-full  text-xl font-semibold">Próximas citas</p>
      </header>
      <Chart
        options={{
          chart: {
            id: "bar",
          },
          xaxis: {
            categories: [
              "Lunes",
              "Martes",
              "Miércoles",
              "Jueves",
              "Sábado",
              "Domingo",
            ],
            // categories: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC'],
          },
        }}
        series={[
          {
            name: "Servicio A",
            data: orderByMonth?.map((e) => e.bills ?? 0),
          },
          {
            name: "Servicio B ",
            data: orderByMonth?.map((e) => e.preBills ?? 0),
          },
          {
            name: "Servicio C",
            data: orderByMonth?.map((e) => e.prepaid ?? 0),
          },
        ]}
        height={250}
        type="bar"
      />
    </div>
  );
};

export default NextAppointments;
