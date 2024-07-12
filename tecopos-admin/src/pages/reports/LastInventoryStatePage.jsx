import { useState } from "react";
import { useAppSelector } from "../../store/hooks";


export default function InvetoriesRealTime() {
  const { areas } = useAppSelector((state) => state.init);
  const areasStock = areas.filter((item) => item.type === "STOCK");
  const [selectedArea, setSelectedArea] = useState(areasStock[0].id);

  return (
    <>
      <header className="bg-white shadow">
        <div className=" mx-auto py-6 px-4 sm:px-3 lg:px-8 flex justify-between">
          <div className="mr-2">
            <h1 className="lg:text-2xl sm:text-sm font-medium text-slate-900">
              Último inventario
            </h1>
          </div>
        </div>
      </header>
      <div className=" mx-auto  py-3 px-4 sm:py-3 sm:px-3  ">
        <main>
          <>
            <div className="ml-8">
              {areasStock.map((item, index) => (
                <>
                  <button
                    key={index}
                    className={`${
                      selectedArea !== item.id
                        ? "items-center my-2   border-2 h-10 rounded-full  border-slate-300 mr-2 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                        : "items-center my-2   border-2 h-10 rounded-full bg-slate-500 text-white  border-slate-700 mr-2 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                    }`}
                    type="button"
                    onClick={() => {
                      setSelectedArea(item.id);
                    }}
                  >
                    {item.name}
                  </button>
                </>
              ))}
            </div>

            <div className="max-w-7xl mx-auto  py-3 px-4 sm:py-3 sm:px-3 lg:max-w-7xl ">
              {/*<Inventory
                selectedArea={selectedArea}
                setMobileFiltersOpen={setMobileFiltersOpen}
                id={selectedArea}
                  />*/}
            </div>
          </>
        </main>
      </div>
    </>
  );
}


