import { useState, useEffect, BaseSyntheticEvent } from "react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Combobox } from "@headlessui/react";
import { useController, UseControllerProps } from "react-hook-form";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { SelectInterface } from "../../interfaces/InterfacesLocal";
import LoadingSpin from "../misc/LoadingSpin";
import { SalesCategories } from "../../interfaces/ServerInterfaces";
import useServerProduct from "../../api/useServerProducts";
import SpinnerLoading from "../misc/SpinnerLoading";

function classNames(...classes: string[]) {
   return classes.filter(Boolean).join(" ");
}

interface InputProps {
   label: string;
   disabled?: boolean;
   loading?: boolean;
   changeState?: Function;
   byDefault?: any;
}

export default function MultiSelectCategorys(props: UseControllerProps & InputProps) {

   const { getAllSalesCategories, allSalesCategories } = useServerProduct();

   const { field, fieldState } = useController(props);
   const { label, disabled, byDefault, loading } = props;

   const [search, setSearch] = useState<string>("");
   const [isSearching, setIsSearching] = useState<boolean>(false);
   const [filtredCategories, setFiltredCategories] = useState<SalesCategories[]>();


   const [selected, setSelected] = useState<SelectInterface[]>(
      allSalesCategories.filter((item) => field?.value?.includes(item.id)) ?? []
   );

   useEffect(() => {
      if (byDefault && search === "") {
         // const values = allSalesCategories.filter((item) => byDefault?.map((e: { id: number }) => e?.id).includes(item.id));
         const values = byDefault
         setSelected(values);
         field.onChange(values.map((item: { id: any; }) => item.id));
      }

      setFiltredCategories(allSalesCategories.filter(prod => {
         if (search !== "") {
            if (prod.name.toLowerCase().includes(search)) {
               return prod;
            }
         }
      }))
   }, [allSalesCategories]);


   useEffect(() => {
      search && getAllSalesCategories()
         .then(
            () => setIsSearching(false)
         )

      setIsSearching(true)

      if (search === "") {
         setIsSearching(false)
      }

   }, [search]);


   //Debounce for filter -----------------------------------------------------------------------------
   const [timeOutId, setTimeOutId] = useState<number | undefined>();
   const onKeyDown = () => {
      clearTimeout(timeOutId);
   };

   const onKeyUp = (e: BaseSyntheticEvent) => {
      const time = Number(
         setTimeout(() => {
            if (e.target.value !== "") {
               setSearch(e.target.value);
            } else {
               setSearch("");
            }
         }, 800)
      );
      setTimeOutId(Number(time));
   };

   //----------------------------------------------------------------------------------------------------

   return (
      <div className="h-auto mt-3 mb-3">
         <Combobox
            as="div"
            value={selected}
            onChange={(e: SelectInterface[]) => {
               setSelected(e);
               field.onChange(e.map((item) => item.id));
               props.changeState && props.changeState(e);
            }}
            disabled={disabled}
            by="id"
            multiple
         >
            <Combobox.Label
               className={`block text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-700"
                  } first-letter:uppercase`}
            >
               <span className="inline-flex items-center">
                  <div className="flex items-center">
                     {label}
                     {isSearching && <LoadingSpin color="gray-700 ml-4" />}
                  </div>
                  {disabled && <LockClosedIcon className="px-2 h-4" />}
               </span>
            </Combobox.Label>
            <div className="relative mt-1">
               <Combobox.Input
                  className={`${fieldState.error
                     ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                     : `focus:ring-gray-500 ${disabled ? "border-gray-300" : "border-gray-400"
                     } focus:border-gray-500 text-gray-500`
                     } border relative w-full rounded-md bg-white py-2 pl-3 pr-10 text-left shadow-sm sm:text-sm`}
                  onKeyDownCapture={onKeyDown}
                  onKeyUp={onKeyUp}
                  displayValue={(item: SelectInterface) => item?.name}
                  placeholder="Introduzca un criterio de búsqueda"
               />

               <div className="absolute p-2 gap-1 right-0 top-0 flex items-center rounded-r-md px-2 focus:outline-none">
                  {fieldState.error && (
                     <ExclamationCircleIcon
                        className="h-5 w-5 text-red-500"
                        aria-hidden="true"
                     />
                  )}
                  {loading && <LoadingSpin color="gray-700" />}
                  <Combobox.Button>
                     <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                     />
                  </Combobox.Button>
               </div>

               {filtredCategories?.length! > 0 && (
                  <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                     {filtredCategories?.map((item) => (
                        <Combobox.Option
                           key={item.id}
                           value={item}
                           className={({ active }) =>
                              classNames(
                                 "relative cursor-default select-none py-2 pl-3 pr-9",
                                 active ? "bg-slate-600 text-white" : "text-gray-900"
                              )
                           }
                        >
                           {({ selected, active, disabled }) => (
                              <>
                                 <span
                                    className={classNames(
                                       selected
                                          ? "font-semibold"
                                          : `${disabled ? "text-gray-300" : "font-normal"
                                          }`,
                                       "block truncate"
                                    )}
                                 >
                                    {item.name}
                                 </span>

                                 {selected && (
                                    <span
                                       className={classNames(
                                          active ? "text-white" : "text-indigo-600",
                                          "absolute inset-y-0 right-0 flex items-center pr-4"
                                       )}
                                    >
                                       <CheckIcon
                                          className="h-5 w-5"
                                          aria-hidden="true"
                                       />
                                    </span>
                                 )}
                              </>
                           )}
                        </Combobox.Option>
                     ))}
                  </Combobox.Options>
               )
               }


               <div className='flex flex-wrap items-center'>
                  {
                     selected.length > 0 && (
                        selected.map((item) => (
                           <span
                              key={item.id}
                              className="inline-flex border border-gray rounded p-1 m-1 bg-gray-300 z-0 cursor-pointer"
                              onClick={() => {
                                 const filtered = selected.filter(
                                    (values) => item.id !== values.id
                                 );
                                 setSelected(filtered);
                                 field.onChange(filtered.map((item) => item.id));
                              }}
                           >
                              {item.name}
                           </span>
                        ))
                     )
                  }
               </div>

               {fieldState.error && (
                  <span className="text-xs text-red-600">
                     {fieldState.error.message}
                  </span>
               )}
            </div>
         </Combobox>
      </div>
   );
}
