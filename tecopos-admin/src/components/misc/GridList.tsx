export interface ListGridInterface {
  name: string;
  description?: string;
  imgSrc: string | null;
}

interface GridList {
  data: ListGridInterface[];
  emptyText?:string
}

export default function GridList({ data, emptyText }: GridList) {
  const imageDefault = require("../../assets/image-default.jpg");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {data.length === 0
        ? <div className="col-span-3 text-center text-gray-700 font-semibold">{emptyText??""}</div>
        : data.map((person, idx) => (
            <div
              key={idx}
              className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm "
            >
              <div className="flex-shrink-0">
                <img
                  className="h-10 w-10 rounded-full"
                  src={person.imgSrc ?? imageDefault}
                  alt=""
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="focus:outline-none">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">
                    {person.name}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {person?.description ?? ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
    </div>
  );
}
