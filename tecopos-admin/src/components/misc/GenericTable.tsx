/* eslint-disable react-hooks/exhaustive-deps */
/*
 * Los datos de la tabla (tablaData) debe contener como primer elemento el id del item para identificar el elemento cuando se de click sobre la fila
 *Los titles deben coincidir con los índices en los datos pasados para el body
 */
import { ChevronRight, TrashOutline } from "heroicons-react";
import {
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import React, {
  useState,
  useEffect,
  BaseSyntheticEvent,
  Fragment,
  useRef,
} from "react";
import SpinnerLoading from "./SpinnerLoading";
import EmptyList from "./EmptyList";
import MultipleActBtn, { BtnActions } from "./MultipleActBtn";
import MultiSelect from "../forms/Multiselect";
import {
  BasicType,
  FilterCodeDatePickerRange,
  FilterCodePriceRange,
  SelectInterface,
} from "../../interfaces/InterfacesLocal";
import ComboBox from "../forms/Combobox";
import Button from "./Button";
import { SubmitHandler, useForm } from "react-hook-form";
import MultipleFilterBtn from "./MultipleFilterBtn";
import { BasicNomenclator } from "../../interfaces/ServerInterfaces";
import Input from "../forms/Input";
import DateInput from "../forms/DateInput";
import { AiOutlineSync } from "react-icons/ai";
import AsyncComboBox from "../forms/AsyncCombobox";
import SelectOrderby from "../forms/SelectOrderby";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { toast } from "react-toastify";
import { setTitlesForExport } from "../../store/slices/nomenclatorSlice";
import { setSpecificColumnSpaceToSave } from "../../store/slices/sessionSlice";
import Select from "../forms/Select";

const MAX_COLUMNS = 9;
const WARNING_THRESHOLD = 7;

export interface SearchingInterface {
  action: Function; //Callback Function to control Searching action
  placeholder?: string;
}

export interface DataTableInterface {
  rowId?: string | number;
  rowColor?: string;
  deletedRow?: boolean;
  rowWihtoutIcon?: boolean;
  boldRow?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
  childRows?: {
    rowId?: string | number;
    payload: Record<string, string | number | React.ReactNode>;
  }[];
  payload: Record<string, string | number | React.ReactNode>;
}

export interface FilterOpts {
  name: string;
  format:
  | "select"
  | "multiselect"
  | "input"
  | "boolean"
  | "datepicker"
  | "datepicker-range"
  | "price-range";
  filterCode: string;
  data?: SelectInterface[];
  icon?: React.ReactNode;
  datepickerRange?: FilterCodeDatePickerRange[];
  priceRange?: FilterCodePriceRange[];
  isUntilToday?: boolean;
  dependentOn?: string; //code del filtro del cual es dependiente esta entrada
  asyncData?: {
    url: string;
    defaultParams?: BasicType;
    idCode: string;
    dataCode: string | string[];
  };
}

interface FilterComponent {
  availableFilters: FilterOpts[];
  filterAction: Function;
}

interface ExtendedNomenclator extends BasicNomenclator {
  action?: (data: number) => void;
  availableOptions: OptionsNomenclator[];
  reset: () => void;
}

interface OptionsNomenclator {
  name: string;
  id: number;
}

interface orderByComponent {
  availableFilters: ExtendedNomenclator[];
}

interface GenericTableProps {
  tableTitles: string[];
  tableData: Array<DataTableInterface>;
  rowAction?: Function; //Callback function to control click on each row. It work with id param
  childRowAction?: Function; //Callback function to control click on each childRow. It work with id param
  searching?: SearchingInterface;
  loading?: boolean;
  paginateComponent?: React.ReactNode;
  actions?: BtnActions[];
  filterComponent?: FilterComponent;
  syncAction?: { action: Function; loading: boolean };
  childRowsAlwaysActive?: boolean;
  genericTableHeigth96?: boolean;
  rowActionDeleteIcon?: boolean;
  lastColumnInGray?: boolean;
  orderBy?: orderByComponent;
  groupBy?: orderByComponent;
  showSpecificColumns?: boolean;
  notShadowBotton?: boolean;
  specificColumnSpaceToSave?: string;
  classRowVoid?: string;
  iconTable?: React.ReactNode;
  headSticky?: boolean;
  maxTableHeight?: string;
}

const GenericTable = ({
  tableTitles,
  tableData,
  rowAction,
  rowActionDeleteIcon,
  childRowAction,
  searching,
  loading,
  paginateComponent,
  actions,
  filterComponent,
  syncAction,
  childRowsAlwaysActive,
  genericTableHeigth96,
  lastColumnInGray,
  orderBy,
  groupBy,
  showSpecificColumns,
  specificColumnSpaceToSave,
  iconTable,
  notShadowBotton,
  classRowVoid,
  headSticky,
  maxTableHeight
}: GenericTableProps) => {
  const dispatch = useAppDispatch();

  const { specificColumnSpaceToSave: specificColumnSpaceToSaveData } =
    useAppSelector((state) => state.session);

  const [selectedTableTitles, setSelectedTableTitles] = useState<
    Array<{ name: string; id: number }>
  >([]);

  useEffect(() => {
    if (showSpecificColumns && specificColumnSpaceToSave) {
      if (specificColumnSpaceToSaveData === undefined) {
        dispatch(
          setSpecificColumnSpaceToSave([
            {
              spaceToSave: specificColumnSpaceToSave,
              selectableTitles: [
                {
                  id: 0,
                  name: tableTitles[0],
                },
                {
                  id: 3,
                  name: tableTitles[3],
                },
                {
                  id: tableTitles.length - 1,
                  name: tableTitles[tableTitles.length - 1],
                },
              ],
            },
          ])
        );

        setSelectedTableTitles([
          {
            name: tableTitles[0],
            id: 0,
          },
          {
            name: tableTitles[3],
            id: 3,
          },
          {
            name: tableTitles[tableTitles.length - 1],
            id: tableTitles.length - 1,
          },
        ]);
      } else {
        const areaIncluded: boolean =
          specificColumnSpaceToSaveData.some(
            (elem) => elem.spaceToSave === specificColumnSpaceToSave
          ) ?? false;

        if (areaIncluded) {
          if (specificColumnSpaceToSaveData.length > 0) {
            setSelectedTableTitles(
              specificColumnSpaceToSaveData
                .find((elem) => elem.spaceToSave === specificColumnSpaceToSave)
                ?.selectableTitles.map((itm) => {
                  return {
                    id: itm?.id,
                    name: tableTitles[itm?.id],
                  };
                }) ?? []
            );
          } else {
            dispatch(
              setSpecificColumnSpaceToSave([
                ...specificColumnSpaceToSaveData,
                {
                  spaceToSave: specificColumnSpaceToSave,
                  selectableTitles: [
                    {
                      id: 0,
                      name: tableTitles[0],
                    },
                    {
                      id: 3,
                      name: tableTitles[3],
                    },
                    {
                      id: tableTitles.length - 1,
                      name: tableTitles[tableTitles.length - 1],
                    },
                  ],
                },
              ])
            );

            setSelectedTableTitles([
              {
                name: tableTitles[0],
                id: 0,
              },
              {
                name: tableTitles[3],
                id: 3,
              },
              {
                name: tableTitles[tableTitles.length - 1],
                id: tableTitles.length - 1,
              },
            ]);
          }
        } else {
          dispatch(
            setSpecificColumnSpaceToSave([
              ...specificColumnSpaceToSaveData,
              {
                spaceToSave: specificColumnSpaceToSave,
                selectableTitles: [
                  {
                    id: 0,
                    name: tableTitles[0],
                  },
                  {
                    id: 3,
                    name: tableTitles[3],
                  },
                  {
                    id: tableTitles.length - 1,
                    name: tableTitles[tableTitles.length - 1],
                  },
                ],
              },
            ])
          );

          setSelectedTableTitles([
            {
              name: tableTitles[0],
              id: 0,
            },
            {
              name: tableTitles[3],
              id: 3,
            },
            {
              name: tableTitles[tableTitles.length - 1],
              id: tableTitles.length - 1,
            },
          ]);
        }
      }
    } else {
      setSelectedTableTitles([
        {
          name: tableTitles[0],
          id: 0,
        },
        {
          name: tableTitles[3],
          id: 3,
        },
        {
          name: tableTitles[tableTitles.length - 1],
          id: tableTitles.length - 1,
        },
      ]);
    }
  }, []);

  const handleColumnSelectionError = () => {
    toast.error("Alcanzada la cantidad máxima de columnas que se pueden seleccionar. 9/9");
  };

  const handleColumnSelectionErrorOverPass = () => {
    toast.error("Deseleccione otras opciones, alcanzada la cantidad máxima de columnas que se pueden seleccionar. 9/9");
  };

  const handleColumnSelectionWarning = () => {
    toast.warning(`La cantidad máxima de columnas que se pueden seleccionar son 9. ${selectedTableTitles.length}/9`);
  };

  const updateTitlesForExport = () => {
    dispatch(setTitlesForExport(selectedTableTitles.map((selected) => selected.name)));
  };

  const createSelectableTitles = () => {
    return selectedTableTitles.map((selected) => ({
      id: tableTitles.indexOf(selected.name),
      name: selected.name,
    }));
  };

  const updateSpecificColumnSpace = () => {
    if (!specificColumnSpaceToSaveData) return;

    const areaIncluded = specificColumnSpaceToSaveData.some(
      (elem) => elem.spaceToSave === specificColumnSpaceToSave
    );

    if (areaIncluded) {
      dispatch(
        setSpecificColumnSpaceToSave(
          specificColumnSpaceToSaveData.map((elem) =>
            elem.spaceToSave === specificColumnSpaceToSave
              ? {
                ...elem,
                selectableTitles: createSelectableTitles(),
              }
              : elem
          )
        )
      );
    } else {
      dispatch(
        setSpecificColumnSpaceToSave([
          ...specificColumnSpaceToSaveData,
          {
            spaceToSave: specificColumnSpaceToSave,
            selectableTitles: createSelectableTitles(),
          },
        ])
      );
    }
  };

  useEffect(() => {
    if (showSpecificColumns) {
      if (selectedTableTitles.length > MAX_COLUMNS) {
        handleColumnSelectionErrorOverPass();
      }else if (selectedTableTitles.length === MAX_COLUMNS) {
        handleColumnSelectionError();
        updateTitlesForExport();
      } else if (selectedTableTitles.length > WARNING_THRESHOLD && selectedTableTitles.length < MAX_COLUMNS) {
        handleColumnSelectionWarning();
        updateTitlesForExport();
        updateSpecificColumnSpace();
      } else {
        updateTitlesForExport();
        if (specificColumnSpaceToSaveData) {
          updateSpecificColumnSpace();
        }
      }
    }
  }, [selectedTableTitles, showSpecificColumns]);

  //Debounce for filter -----------------------------------------------------------------------------
  const time = useRef<any>();

  const onChange = (e: BaseSyntheticEvent) => {
    if (!!time.current) clearTimeout(time.current);
    time.current = setTimeout(() => {
      const value = e.target.value;
      if (value !== "") {
        searching?.action(value);
      } else {
        searching?.action(null);
      }
    }, 1200);
  };

  //----------------------------------------------------------------------------------

  const [btnSearch, setBtnSearch] = useState(false);
  const [searchValue, setSearchValue] = useState<string | null>(null);

  useEffect(() => {
    if (searchValue === null && btnSearch) setBtnSearch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  //----------------------------------------------------------------------------------------------------

  //Manage Filter --------------------------------------------------------------------------------------
  const { control, handleSubmit, unregister, register, watch } = useForm();
  const [filterActived, setFilterActived] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<BasicNomenclator[]>([]);
  const activeIndex = selectedFilter.map((item) => item.id);

  useEffect(() => {
    const disabledFiltersCode = filterComponent?.availableFilters
      .filter((_, idx) => !activeIndex.includes(idx))
      .map((item) => item.filterCode);
    if (selectedFilter.length === 0 && filterActived) {
      filterComponent?.filterAction(null);
      setFilterActived(false);
    }
    unregister(disabledFiltersCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter]);

  const activatedFilters = filterComponent?.availableFilters?.filter((_, idx) =>
    activeIndex.includes(idx)
  );

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    filterComponent?.filterAction(data);
  };

  const filterSelectorData: BasicNomenclator[] =
    filterComponent?.availableFilters?.map((item, idx) => ({
      id: idx,
      name: item.name,
    })) ?? [];

  //-----------------------------------------------------------------------------------------------------

  //Manage Child Rows------------------------------------------------------------------------------------
  const [currentParent, setCurrentParent] = useState<string | number | null>(
    null
  );

  useEffect(() => {
    if (currentParent) {
      const elements = document.querySelectorAll(`.parent-${currentParent}`);
      elements.forEach((elem) => {
        elem.removeAttribute("hidden");
      });
    }
  }, [currentParent, tableData]);

  const changeChildRow = (id: string | number) => {
    const elements = document.querySelectorAll(`.parent-${currentParent}`);
    elements.forEach((elem) => {
      if (!childRowsAlwaysActive || childRowsAlwaysActive === undefined) {
        elem.setAttribute("hidden", "true");
      } else {
        elem.setAttribute("hidden", "false");
      }
    });
    currentParent === id ? setCurrentParent(null) : setCurrentParent(id);
  };

  //-----------------------------------------------------------------------------------------------------

  const [selectedFilterOrder, setSelectedFilterOrder] = useState<
    ExtendedNomenclator[]
  >([]);
  const [selectedFilterGroup, setSelectedFilterGroup] = useState<
    ExtendedNomenclator[]
  >([]);

  function compare_update_arrays(
    array1: ExtendedNomenclator[],
    array2: ExtendedNomenclator[]
  ) {
    const array = array2.filter((elemento2) => {
      return !array1.some((elemento1) => elemento1.id === elemento2.id);
    });
    setSelectedFilterOrder(array);
  }
  const btnOrderbyAction = (e: ExtendedNomenclator[]) => {
    compare_update_arrays(selectedFilterOrder, e);
  };

  function compare_update_arrays_group(
    array1: ExtendedNomenclator[],
    array2: ExtendedNomenclator[]
  ) {
    const array = array2.filter((elemento2) => {
      return !array1.some((elemento1) => elemento1.id === elemento2.id);
    });
    if (array.length === 0 && selectedFilterGroup.length > 0) {
      if (typeof selectedFilterGroup[0].reset === "function") {
        selectedFilterGroup[0].reset();
      }
      setSelectedFilterGroup(array);
      return;
    }
    setSelectedFilterGroup(array);
    if (array.length === 0) return;
    let id = array[0].id as number;
    if (typeof array[0].action === "function" && typeof id === "number") {
      array[0].action(id);
    }
  }

  const btnGroupbyAction = (e: ExtendedNomenclator[]) => {
    compare_update_arrays_group(selectedFilterGroup, e);
  };
  return (
    <div
      className={`flex flex-col h-full ${genericTableHeigth96 ? "h-screen" : ""
        }`}
    >
      {filterComponent && selectedFilter.length !== 0 && (
        <div
          className={`flex border border-gray-200 bg-gray-50 rounded-lg my-2 shadow-md px-5 py-2 w-full`}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="lg:inline-flex gap-10 items-center w-full p-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center w-full justify-center">
              {activatedFilters?.map((item, idx) =>
                item.format === "select" && item.asyncData ? (
                  <AsyncComboBox
                    key={idx}
                    name={item.filterCode}
                    control={control}
                    dataQuery={{
                      url: item.asyncData.url,
                      defaultParams: item.asyncData?.defaultParams,
                    }}
                    label={item.name}
                    normalizeData={{
                      id: item.asyncData.idCode,
                      name: item.asyncData.dataCode,
                    }}
                    dependendValue={
                      item.dependentOn
                        ? { [item.dependentOn]: watch(item.dependentOn) }
                        : undefined
                    }
                  />
                ) : item.format === "select" ? (
                  <ComboBox
                    key={idx}
                    name={item.filterCode}
                    control={control}
                    data={item.data ?? []}
                    label={item.name}
                    rules={{ required: "Seleccione" }}
                  />
                ) : item.format === "multiselect" ? (
                  <MultiSelect
                    key={idx}
                    name={item.filterCode}
                    control={control}
                    data={item.data ?? []}
                    label={item.name}
                    rules={{ required: "Seleccione" }}
                  />
                ) : item.format === "input" ? (
                  <Input
                    key={idx}
                    name={item.filterCode}
                    control={control}
                    label={item.name}
                  />
                ) : item.format === "boolean" ? (
                  <div
                    key={idx}
                    className="flex gap-2 font-normal items-center"
                  >
                    <input
                      className="h-4 w-4 rounded border-gray-400 focus:bg-transparent text-slate-400 focus:ring-transparent"
                      {...register(item.filterCode)}
                      type={"checkbox"}
                      value="true"
                    />
                    {item?.icon}
                    {item.name}
                  </div>
                ) : item.format === "datepicker-range" ? (
                  <div
                    key={idx}
                    className="flex gap-1 font-normal items-center"
                  >
                    {item.datepickerRange?.map((rangeDatePicker, index) => {
                      return (
                        <DateInput
                          key={index}
                          name={rangeDatePicker.filterCode}
                          label={rangeDatePicker.name}
                          control={control}
                          rules={{ required: "Este campo es requerido" }}
                          untilToday={rangeDatePicker.isUnitlToday}
                          includeTime={rangeDatePicker.includingTime}
                        />
                      );
                    })}
                  </div>
                ) : item.format === "price-range" ? (
                  <div
                    key={idx}
                    className="flex gap-1 font-normal items-center"
                  >
                    {item.priceRange?.map((priceRange, index) => {
                      return index !== 2 ? (
                        <Input
                          key={index}
                          name={priceRange.filterCode}
                          control={control}
                          type="number"
                          label={priceRange.name}
                          rules={{ required: "Este campo es requerido" }}
                          textAsNumber
                        />
                      ) : (
                        <Select
                          key={index}
                          name={priceRange.filterCode}
                          label={priceRange.name}
                          control={control}
                          data={
                            priceRange?.currencies?.map((item) => ({
                              id: item,
                              name: item,
                            })) ?? []
                          }
                          rules={{ required: "Este campo es requerido" }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  item.format === "datepicker" && (
                    <div
                      key={idx}
                      className="flex gap-1 font-normal items-center"
                    >
                      <DateInput
                        name={item.filterCode}
                        label={item.name}
                        control={control}
                        rules={{ required: "Este campo es requerido" }}
                        untilToday={item?.isUntilToday}
                      />
                    </div>
                  )
                )
              )}
            </div>
            <div className="pt-5 lg:p-0 flex justify-center items-center flex-shrink-0 gap-1">
              <Button
                name="Aplicar"
                color="slate-500"
                type="submit"
                textColor="slate-500"
                outline
              />
              <Button
                name="Eliminar filtros"
                color="slate-500"
                action={() => setSelectedFilter([])}
                textColor="slate-500"
                outline
              />
            </div>
          </form>
        </div>
      )}
      <div className="w-full align-middle">
        <div
          className={` ${notShadowBotton
            ? ""
            : `shadow ring-1 ring-black ring-opacity-5 md:rounded-lg`
            }`}
        >
          {(searching ||
            actions ||
            filterComponent ||
            syncAction ||
            orderBy ||
            showSpecificColumns ||
            iconTable) && (
              <div
                className={`inline-flex w-full gap-3 items-center px-5 py-3 ${!searching ? "justify-end" : ""
                  }`}
              >
                {orderBy && (
                  <div
                    className={
                      selectedFilterOrder.length > 0
                        ? "flex justify-between flex-1 items-center"
                        : "flex justify-end flex-1 items-center"
                    }
                  >
                    <div className={"flex gap-5 p-2"}>
                      {selectedFilterOrder.map((e) => (
                        <SelectOrderby
                          key={e.id}
                          data={e.availableOptions}
                          label={e.name}
                          action={e.action}
                          reset={e.reset}
                        />
                      ))}
                    </div>
                    <MultipleFilterBtn
                      btnName="Ordenar por"
                      data={orderBy.availableFilters}
                      selected={selectedFilterOrder}
                      setSelected={btnOrderbyAction}
                    />
                  </div>
                )}

                {groupBy && (
                  <MultipleFilterBtn
                    btnName="Agrupar por"
                    data={groupBy.availableFilters}
                    selected={selectedFilterGroup}
                    setSelected={btnGroupbyAction}
                  />
                )}

                {searching && (
                  <>
                    <div
                      className={`flex w-full bg-inherit ${!(filterComponent || actions) && "m-auto"
                        }`}
                    >
                      <div className="relative w-full text-gray-400">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-0">
                          <MagnifyingGlassIcon
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                        </div>
                        <input
                          id="search"
                          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 text-gray-300 placeholder-gray-400 focus:border-transparent focus:bg-opacity-100 focus:text-gray-900 focus:placeholder-gray-500 focus:outline-none focus:ring-0 sm:text-sm"
                          placeholder={searching?.placeholder}
                          type="search"
                          name="search"
                          onChange={onChange}
                        />
                      </div>
                    </div>
                  </>
                )}

                {syncAction && (
                  <AiOutlineSync
                    className={`cursor-pointer text-lg ${syncAction.loading ? "animate-spin" : ""
                      }`}
                    onClick={() => syncAction.action()}
                  />
                )}

                {filterComponent && (
                  <MultipleFilterBtn
                    selected={selectedFilter}
                    data={filterSelectorData}
                    setSelected={(data: BasicNomenclator[]) => {
                      setSelectedFilter(data);
                      !filterActived && setFilterActived(true);
                    }}
                  />
                )}

                {showSpecificColumns && (
                  <MultipleFilterBtn
                    btnName="Mostrar columnas"
                    data={
                      tableTitles.map((title, id) => {
                        return {
                          name: title,
                          id: id,
                        };
                      }) ?? []
                    }
                    selected={selectedTableTitles}
                    setSelected={
                      selectedTableTitles.length < 9
                        ? setSelectedTableTitles
                        : (item: any) => {
                          if (item.length === 8) setSelectedTableTitles(item);
                        }
                    }
                  />
                )}

                {actions && <MultipleActBtn items={actions} />}

                {iconTable && (
                  <div className="inline-flex flex-shrink-0">{iconTable}</div>
                )}
              </div>
            )}

          <div className={`w-full overflow-auto h-full ${!!maxTableHeight ? `max-h-[${maxTableHeight}]` : ''}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`bg-gray-50 ${headSticky ? 'sticky top-0': ''}`}>
              <tr>
                {selectedTableTitles?.find(
                  (selectTitle) => selectTitle?.id === 0
                ) && (
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 max-w-xs break-words text-left text-sm font-semibold text-gray-900 sm:pl-6 first-letter:uppercase"
                    >
                      {tableTitles[0]}
                    </th>
                  )}

                {tableTitles.slice(1).map((title, index) => {
                  if (
                    showSpecificColumns !== undefined &&
                    showSpecificColumns
                  ) {
                    if (
                      selectedTableTitles?.find(
                        (selectTitle) => selectTitle?.name === title
                      )
                    ) {
                      return (
                        <th
                          key={index}
                          scope="col"
                          className={`px-3 py-3.5 max-w-xs break-words text-sm text-center font-semibold text-gray-900 first-letter:uppercase ${lastColumnInGray &&
                            tableTitles.length === index + 2 &&
                            "bg-gray-300"
                            }`}
                        >
                          {title}
                        </th>
                      );
                    }
                  } else {
                    return (
                      <th
                        key={index}
                        scope="col"
                        className={`px-3 py-3.5 max-w-xs break-words text-sm text-center font-semibold text-gray-900 first-letter:uppercase ${lastColumnInGray &&
                          tableTitles.length === index + 2 &&
                          "bg-gray-300"
                          }`}
                      >
                        {title}
                      </th>
                    );
                  }
                })}

                {rowAction && (
                  <th
                    scope="col"
                    className="relative py-3.5 pl-3 pr-4 sm:pr-6 first-letter:uppercase"
                  >
                    <span className="sr-only">Edit</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading && loading === true ? (
                <tr>
                  <td
                    colSpan={tableTitles.length + 1}
                    className=" px-3 py-5 text-sm text-gray-500 text-center"
                  >
                    <SpinnerLoading />
                  </td>
                </tr>
              ) : tableData.length !== 0 ? (
                tableData.map((info, key) => (
                  <Fragment key={key}>
                    <tr
                      onClick={() => rowAction && rowAction(info.rowId)}
                      className={`
                      ${key % 2 === 0 ? "" : "bg-gray-100"}
                       ${rowAction ? "cursor-pointer" : ""}
                        ${info?.deletedRow ? "line-through" : ""}
                         ${info.boldRow ? "font-bold" : ""}
                          ${info.borderTop ? "border-t border-gray-500" : ""}
                           ${info.borderBottom ? "border-b border-gray-500" : ""
                        }
                           ${info.rowColor ? `bg-${info.rowColor}` : ""}
                           `}
                    >
                      {selectedTableTitles?.find(
                        (selectTitle) => selectTitle?.id === 0
                      ) && (
                          <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            <div className="inline-flex gap-2 items-center">
                              {info.payload[tableTitles[0]]}
                              {info.childRows && (
                                <span
                                  className="border-2 border-gray-400 rounded-full  h-4 w-4 flex justify-center items-center cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    changeChildRow(info.rowId!);
                                  }}
                                >
                                  {!childRowsAlwaysActive ||
                                    childRowsAlwaysActive === undefined ? (
                                    currentParent === info.rowId ? (
                                      <MinusIcon className="h-full font-bold" />
                                    ) : (
                                      <PlusIcon className="h-full font-bold" />
                                    )
                                  ) : currentParent === info.rowId ? (
                                    <MinusIcon className="h-full font-bold" />
                                  ) : (
                                    <PlusIcon className="h-full font-bold" />
                                  )}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                      {tableTitles.slice(1).map((item, index) => {
                        if (
                          showSpecificColumns !== undefined &&
                          showSpecificColumns
                        ) {
                          if (
                            selectedTableTitles?.find(
                              (selectTitle) => selectTitle?.name === item
                            )
                          ) {
                            return lastColumnInGray ? (
                              <td
                                key={index}
                                className={`px-3 py-4 text-sm max-w-xs break-words text-gray-500 text-ellipsis text-center ${tableTitles.length === index + 2 &&
                                  `bg-gray-300 font-semibold text-slate-600 border-b  ${info.borderTop &&
                                    tableTitles.length === index + 2
                                    ? "border-t border-t-gray-500 "
                                    : ""
                                  } ${info.borderBottom &&
                                    tableTitles.length === index + 2
                                    ? "border-b border-gray-500"
                                    : ""
                                  }`
                                  }`}
                              >
                                {info.payload[item]}
                              </td>
                            ) : (
                              <td
                                key={index}
                                className="px-3 py-4 text-sm max-w-xs break-words text-gray-500 text-ellipsis text-center"
                              >
                                {info.payload[item]}
                              </td>
                            );
                          }
                        } else {
                          return lastColumnInGray ? (
                            <td
                              key={index}
                              className={`px-3 py-4 text-sm max-w-xs break-words text-gray-500 text-ellipsis text-center ${tableTitles.length === index + 2 &&
                                `bg-gray-300 font-semibold text-slate-600 border-b  ${info.borderTop &&
                                  tableTitles.length === index + 2
                                  ? "border-t border-t-gray-500 "
                                  : ""
                                } ${info.borderBottom &&
                                  tableTitles.length === index + 2
                                  ? "border-b border-gray-500"
                                  : ""
                                }`
                                }`}
                            >
                              {info.payload[item]}
                            </td>
                          ) : (
                            <td
                              key={index}
                              className="px-3 py-4 text-sm max-w-xs break-words text-gray-500 text-ellipsis text-center"
                            >
                              {info.payload[item]}
                            </td>
                          );
                        }
                      })}
                      {rowAction && (
                        <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <span className="flex justify-end text-slate-600 hover:text-indigo-900">
                            {info.rowWihtoutIcon !== undefined ? (
                              info.rowWihtoutIcon ? (
                                ""
                              ) : rowActionDeleteIcon ? (
                                <TrashOutline className="h-5" color="red" />
                              ) : (
                                <ChevronRight className="h-5" />
                              )
                            ) : rowActionDeleteIcon ? (
                              <TrashOutline className="h-5" color="red" />
                            ) : (
                              <ChevronRight className="h-5" />
                            )}
                          </span>
                        </td>
                      )}
                    </tr>

                    {info.childRows &&
                      info.childRows.map((subItem, idx) => (
                        <tr
                          onClick={() =>
                            childRowAction &&
                            childRowAction(subItem.rowId, info.rowId)
                          }
                          hidden={
                            !childRowsAlwaysActive ||
                              childRowsAlwaysActive === undefined
                              ? true
                              : false
                          }
                          key={idx}
                          className={`parent-${info.rowId} ${idx % 2 === 0 ? "" : "bg-gray-100"
                            } cursor-pointer`}
                        >
                          <td className=" py-2 pl-4 pr-3 text-sm font-medium text-gray-500 sm:pl-10">
                            {subItem.payload[tableTitles[0]]}
                          </td>
                          {tableTitles.slice(1).map((item, index) => {
                            if (
                              showSpecificColumns !== undefined &&
                              showSpecificColumns
                            ) {
                              if (
                                selectedTableTitles.filter(
                                  (element) => element.name === item
                                ).length > 0
                              ) {
                                return (
                                  <td
                                    key={index}
                                    className="px-3 py-2 text-sm text-gray-500 text-ellipsis text-center"
                                  >
                                    {subItem.payload[item]}
                                  </td>
                                );
                              }
                            } else {
                              return (
                                <td
                                  key={index}
                                  className="px-3 py-2 text-sm text-gray-500 text-ellipsis text-center"
                                >
                                  {subItem.payload[item]}
                                </td>
                              );
                            }
                          })}

                          {rowAction && (
                            <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              <span className="sr-only"></span>
                            </td>
                          )}
                        </tr>
                      ))}
                  </Fragment>
                ))
              ) : (
                <tr className={` ${classRowVoid ? classRowVoid : ``}`}>
                  <td
                    colSpan={tableTitles.length + 1}
                    className={` px-3 py-5 text-sm text-gray-500  `}
                  >
                    <EmptyList />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {paginateComponent && paginateComponent}
        </div>
      </div>
    </div>
  );
};

export default GenericTable;
