import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import {
  BaseSyntheticEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useState } from "react";

interface SearchProps {
  findAction: Function;
  placeholder?: string;
  disabled?: boolean;
}

const SearchComponent = ({
  findAction,
  placeholder,
  disabled,
}: SearchProps) => {
  //Debounce for filter -----------------------------------------------------------------------------

  const time = useRef<any>();

  const onChange = (e: BaseSyntheticEvent) => {
    if (!!time.current) clearTimeout(time.current);
    time.current = setTimeout(() => {
      const value = e.target.value;
      if (value !== "") {
        findAction(value);
      }else{
        findAction(null)
      }
    }, 1200);

  };

  //-------------------------------------------------------------------------------------------------

  return (
    <div className=" w-full bg-inherit">
      <label htmlFor="search" className="sr-only">
        Buscar
      </label>
      <div className="relative flex text-gray-400">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        </div>
        <input
          id="search"
          className={`w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 text-gray-300 placeholder-gray-400 focus:border-gray-800 focus:bg-opacity-100 focus:text-gray-900 focus:placeholder-gray-500 focus:outline-none focus:ring-0 sm:text-sm ${
            disabled && "cursor-not-allowed"
          }`}
          placeholder={placeholder}
          name="search"
          autoComplete="off"
          disabled={disabled}
          onChange={onChange}
          onKeyDown={(e)=>e.key === "Enter" && e.preventDefault()}
        />
      </div>
    </div>
  );
};

export default SearchComponent;
