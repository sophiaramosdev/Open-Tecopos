/* eslint-disable react-hooks/exhaustive-deps */
import {
  useState,
  useEffect,
  useRef,
  BaseSyntheticEvent,
  useMemo,
} from "react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Combobox } from "@headlessui/react";
import { useController, UseControllerProps } from "react-hook-form";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import LoadingSpin from "../misc/LoadingSpin";
import apiQuery from "../../api/APIServices";
import { generateUrlParams } from "../../utils/helpers";
import useServer from "../../api/useServerMain";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface InputProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  dataQuery: {
    url: string;
    defaultParams?: BasicType;
  };
  nullOpt?: { id: string | number | null; name: string };
  normalizeData: {
    id: string;
    name: string | string[];
    disabled?: (string | number)[];
    format?: string;
  };
  undefinedFormat?: string;
  defaultItem?: { id: string | number | null; name: string };
  dependendValue?: BasicType;
  callback?: Function;
  placeholder?: string;
  nameTransformers?: ((name: string) => string)[];
}

export default function AsyncComboBox(props: UseControllerProps & InputProps) {
  const { manageErrors } = useServer();
  const { field, fieldState } = useController(props);
  const {
    label,
    className,
    disabled,
    defaultItem,
    dataQuery,
    normalizeData,
    dependendValue,
    callback,
    nullOpt,
    undefinedFormat,
    placeholder,
    nameTransformers = [],
  } = props;

  useEffect(() => {
    if (field.value === undefined) setSelectedData(null);
  }, [field.value]);
  //query management states ----------------------------------------------------------
  const [query, setQuery] = useState<string | null>(null);
  const [data, setData] = useState<SelectInterface[]>(
    defaultItem && !dataQuery.defaultParams ? [defaultItem] : []
  );
  const [selectedData, setSelectedData] = useState<SelectInterface | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const currentDependendValue = useRef<
    string | number | boolean | null | undefined
  >();

  useEffect(() => {
    if (!!defaultItem) field.onChange(defaultItem.id);
  }, []);

  useEffect(() => {
    if (!field.value) setSelectedData(null);
  }, [field]);

  const allParams: BasicType | undefined = useMemo(() => {
    let params: BasicType = {};
    if (dataQuery.defaultParams) {
      params = { ...dataQuery.defaultParams };
    }
    if (dependendValue) {
      const [key, value] = Object.entries(dependendValue)[0];
      if (value !== currentDependendValue.current) {
        currentDependendValue.current = value;
        params[key] = currentDependendValue.current;
      }
    }
    if (query) {
      params.search = query;
    }

    return params;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependendValue, query]);

  //------------------------------------------------------------------------------------

  //API query --------------------------------------------------------------------------
  const apiCall = async (params: BasicType) => {
    setLoading(true);
    await apiQuery
      .get(`${dataQuery.url}${generateUrlParams(params)}`)
      .then((resp) => {
        const items: SelectInterface[] = resp.data.items.map(
          (elem: Record<string, string | number | boolean | null>) => {
            if (typeof normalizeData.name === "string") {
              return {
                id: elem[normalizeData.id],
                name: elem[normalizeData.name],
              };
            } else {
              if (!!normalizeData.format) {
                let str = normalizeData.format;
                const keys = normalizeData.name;
                let name = str;
                for (const key of keys) {
                  const value = !!elem[key]
                    ? (elem[key] as string)
                    : undefinedFormat || "-";
                  name = name.replace(key, value);
                }
                // Apply name transformers 
                //Todo : mejorar  
                if (nameTransformers.length !== 0) {
                  name = str;
                  for (const idx in keys) {
                    const value = !!elem[keys[idx]]
                      ? nameTransformers[idx] &&
                      nameTransformers[idx](elem[keys[idx]] as string)
                      : undefinedFormat || "-";
                    name = name.replace(keys[idx], value);
                  }
                }

                return {
                  id: elem[normalizeData.id],
                  name,
                };
              }
              const key = normalizeData.name.find((key) => !!elem[key]);
              return {
                id: elem[normalizeData.id],
                name: key ? elem[key] : "-",
              };
            }
          }
        );
        setData(nullOpt ? [nullOpt, ...items] : items);
        callback && callback(resp.data.items);
      })
      .catch((e) => manageErrors(e));
    setLoading(false);
  };

  useEffect(() => {
    const elemDefault = data.find(
      (item) => item.id === defaultItem?.id || item.id === field.value
    );
    if (!!elemDefault) {
      setSelectedData(elemDefault);
    } else {
      setSelectedData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultItem, data]);

  useEffect(() => {
    if (Object.values(allParams).length !== 0 && !disabled) {
      apiCall(allParams);
    }
  }, [allParams]);

  //-------------------------------------------------------------------------

  //Debounce for filter -----------------------------------------------------------------------------
  const [timeOutId, setTimeOutId] = useState<number | undefined>();
  const onKeyDown = () => {
    clearTimeout(timeOutId);
  };

  const onKeyUp = (e: BaseSyntheticEvent) => {
    const time = Number(
      setTimeout(() => {
        if (e.target.value !== "") {
          setQuery(e.target.value);
        } else {
          setQuery(null);
        }
      }, 800)
    );
    setTimeOutId(Number(time));
  };
  //--------------------------------------------------------------------------------

  return (
    <div className={className ? className : ""}>
      <Combobox
        as="div"
        value={selectedData}
        onChange={(e: SelectInterface) => {
          setSelectedData(e);
          field.onChange(e.id);
        }}
        disabled={disabled}
        by={(current, rest) => current?.id === rest?.id}
      >
        {label && (
          <Combobox.Label
            className={`block text-sm font-medium mb-1 ${disabled ? "text-gray-400" : "text-gray-700"
              } first-letter:uppercase`}
          >
            <span className="inline-flex items-center">
              {label}
              {disabled && <LockClosedIcon className="px-2 h-4" />}
            </span>
          </Combobox.Label>
        )}
        <div className="relative">
          <Combobox.Input
            className={`${fieldState.error
                ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : `focus:ring-gray-500 ${disabled ? "border-gray-300" : "border-gray-400"
                } focus:border-gray-500 text-gray-500`
              } border relative w-full rounded-md bg-white py-2 pl-3 pr-10 text-left shadow-sm sm:text-sm`}
            onKeyDownCapture={onKeyDown}
            onKeyUp={onKeyUp}
            displayValue={(person: SelectInterface) => person?.name}
            placeholder={placeholder ? placeholder : "Criterio de búsqueda"}
          />
          <div className="absolute p-2 gap-1 right-0 top-0 flex items-center rounded-r-md px-2 focus:outline-none">
            {loading && <LoadingSpin color="gray-700" />}
            <Combobox.Button>
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>

          {data.length > 0 && (
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm scrollbar-thin scrollbar-thumb-gray-400">
              {data.map((person) => (
                <Combobox.Option
                  key={person.id}
                  value={person}
                  disabled={normalizeData?.disabled?.some(
                    (item: any) => item === person.id
                  )}
                  className={({ active, disabled }) =>
                    classNames(
                      "relative cursor-default select-none py-2 pl-3 pr-9",
                      active
                        ? "bg-slate-600 text-white"
                        : disabled
                          ? "text-gray-400 bg-white"
                          : "text-gray-900"
                    )
                  }
                >
                  {({ active, selected }) => (
                    <>
                      <span
                        className={classNames(
                          "block truncate",
                          `${selected ? "font-semibold" : ""}`
                        )}
                      >
                        {person.name}
                      </span>

                      {selected && (
                        <span
                          className={classNames(
                            "absolute inset-y-0 right-0 flex items-center pr-4",
                            active ? "text-white" : "text-indigo-600"
                          )}
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          )}
          {fieldState.error && (
            <>
              <ExclamationCircleIcon
                className="absolute h-5 w-5 text-red-500 top-2 right-8"
                aria-hidden="true"
              />
              <span className="absolute text-xs text-red-600 top-10 left-0 ">
                {fieldState.error.message}
              </span>
            </>
          )}
        </div>
      </Combobox>
    </div>
  );
}
