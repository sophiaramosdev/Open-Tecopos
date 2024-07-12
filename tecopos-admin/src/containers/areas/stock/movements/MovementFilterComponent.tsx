import { Disclosure } from "@headlessui/react";
import { MinusSmOutline, PlusSmOutline } from "heroicons-react";
import { translateOperation } from "../../../../utils/translate"; 

interface MovementFilter{
    options:(string)[]
    current:string | null;
    action:Function
}

const MovementFilterComponent = ({options, current, action}:MovementFilter) => {
  return (
    <form className="mt-4 border-t border-gray-200">
      <Disclosure as="div" className="border-t border-gray-200 px-4 py-6">
        {({ open }) => (
          <>
            <h3 className="-mx-2 -my-3 flow-root">
              <Disclosure.Button className="px-2 py-3 bg-white w-full flex items-center justify-between text-gray-400 hover:text-gray-500">
                <span className="font-medium text-gray-900">
                  Operaciones de movimientos
                </span>
                <span className="ml-6 flex items-center">
                  {open ? (
                    <MinusSmOutline className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <PlusSmOutline className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
              </Disclosure.Button>
            </h3>

            <Disclosure.Panel className="pt-6">
              <div className="space-y-6">
                <div
                  onClick={() => action(null)}
                  className={
                    current === null
                      ? "bg-slate-400 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                      : "  border-solid flex flex-row  p-1 hover:bg-slate-400 sm:rounded-sm "
                  }
                >
                  <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                    Todas
                  </label>
                </div>
              </div>
            </Disclosure.Panel>

            {options.map((item, idx)=>(
                <Disclosure.Panel className="pt-6" key={idx}>
                <div className="space-y-6">
                  <div
                    onClick={() => action(item)}
                    className={
                      current === item
                        ? "bg-emerald-400 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                        : "  border-solid flex flex-row  p-1 hover:bg-emerald-400 sm:rounded-sm "
                    }
                  >
                    <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                      {translateOperation(item)}
                    </label>
                  </div>
                </div>
              </Disclosure.Panel>
            ))}
            {/*<Disclosure.Panel className="pt-6">
              <div className="space-y-6">
                <div
                  onClick={() => setOperation("ENTRY")}
                  className={
                    operation === "ENTRY"
                      ? "bg-emerald-400 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                      : "  border-solid flex flex-row  p-1 hover:bg-emerald-400 sm:rounded-sm "
                  }
                >
                  <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                    Entradas
                  </label>
                </div>
              </div>
            </Disclosure.Panel>

            <Disclosure.Panel className="pt-6">
              <div className="space-y-6">
                <div
                  onClick={() => setOperation("OUT")}
                  className={
                    operation === "OUT"
                      ? "bg-orange-300 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                      : "  border-solid flex flex-row  p-1 hover:bg-orange-400 sm:rounded-sm "
                  }
                >
                  <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                    Salida
                  </label>
                </div>
              </div>
            </Disclosure.Panel>

            <Disclosure.Panel className="pt-6">
              <div className="space-y-6">
                <div
                  onClick={() => setOperation("MOVEMENT")}
                  className={
                    operation === "MOVEMENT"
                      ? "bg-blue-400 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                      : "  border-solid flex flex-row  p-1 hover:bg-blue-400 sm:rounded-sm "
                  }
                >
                  <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                    Traslado
                  </label>
                </div>
              </div>
            </Disclosure.Panel>

            <Disclosure.Panel className="pt-6">
              <div className="space-y-6">
                <div
                  onClick={() => setOperation("PROCESSED")}
                  className={
                    operation === "PROCESSED"
                      ? "bg-purple-400 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                      : "  border-solid flex flex-row  p-1 hover:bg-purple-400 sm:rounded-sm "
                  }
                >
                  <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                    Procesado
                  </label>
                </div>
              </div>
            </Disclosure.Panel>

            <Disclosure.Panel className="pt-6">
              <div className="space-y-6">
                <div
                  onClick={() => setOperation("ADJUST")}
                  className={
                    operation === "ADJUST"
                      ? "bg-yellow-300 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                      : "  border-solid flex flex-row  p-1 hover:bg-yellow-400 sm:rounded-sm "
                  }
                >
                  <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                    Ajuste
                  </label>
                </div>
              </div>
            </Disclosure.Panel>

            <Disclosure.Panel className="pt-6">
              <div className="space-y-6">
                <div
                  onClick={() => setOperation("WASTE")}
                  className={
                    operation === "WASTE"
                      ? "bg-stone-400 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                      : "  border-solid flex flex-row  p-1 hover:bg-stone-400 sm:rounded-sm "
                  }
                >
                  <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                    Desperdicios
                  </label>
                </div>
              </div>
            </Disclosure.Panel>

            <Disclosure.Panel className="pt-6">
              <div className="space-y-6">
                <div
                  onClick={() => setOperation("REMOVED")}
                  className={
                    operation === "REMOVED"
                      ? "bg-red-400 border-solid flex flex-row sm:rounded-sm p-1 hover:bg-gray-400"
                      : "  border-solid flex flex-row  p-1 hover:bg-red-400 sm:rounded-sm "
                  }
                >
                  <label className="mt-1 max-w-2xl text-sm font-medium  text-slate-900 ml-2">
                    Eliminado
                  </label>
                </div>
              </div>
                </Disclosure.Panel>*/}
          </>
        )}
      </Disclosure>
    </form>
  );
};

export default MovementFilterComponent;
