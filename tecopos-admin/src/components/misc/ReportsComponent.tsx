import SpinnerLoading from "./SpinnerLoading";

const stats = [
  { id: 1, name: "Transactions every 24 hours", value: "44 million" },
  { id: 2, name: "Assets under holding", value: "$119 trillion" },
  { id: 3, name: "New users annually", value: "46,000" },
];

export interface ReportInterface {
  name: string;
  value: number | string;
  color?:string
}

interface ReportComponent {
  report: ReportInterface[];
  isLoading?: boolean;
  description?: string;
}

export default function ReportsComponent({
  report,
  isLoading,
  description = "Cargando reportes..."
}: ReportComponent) {
  if (isLoading)
    return (
      <div className="bg-gray-100 py-10">
        <SpinnerLoading text={description} />
      </div>
    );
  return (
    
    <div className="bg-gray-100 py-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-4 ">
          {report.map((stat, idx) => (
            <div key={idx} className="mx-auto flex max-w-xs flex-col gap-y-3">
              <dt className="text-base leading-7 text-gray-600">{stat.name}</dt>
              <dd className={`order-first font-semibold tracking-tight text-${stat.color ? stat.color :"gray-600"} sm:text-3xl lg:text-lg xl:text-2xl`}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
