import { useState } from "react";
import { Combobox } from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCheck } from "@fortawesome/free-solid-svg-icons";
import defaultImage from "../../assets/png/stock-product-default.png";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MySelectWhithSearch({
  dataFilter,
  value,
  onChange,
  label,
  className,
  displayValue,
  name,
}) {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(
    dataFilter.find((item) => item.id === value)
  );

  const filtered =
    query === ""
      ? dataFilter
      : dataFilter.filter((item) => {
          return item.name.toLowerCase().includes(query.toLowerCase());
        });

  return (
    <Combobox
      as="div"
      className={`${className} w-full`}
      value={value}
      onChange={(selected) => {
        setSelectedItem(selected);
        onChange({ name, value: selected.id });
      }}
    >
      <Combobox.Label className="block text-sm font-medium text-gray-700">
        {label}
      </Combobox.Label>
      <div className="relative mt-1">
        <Combobox.Input
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:ring-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 sm:text-sm"
          displayValue={() =>
            selectedItem?.name === undefined ? displayValue : selectedItem?.name
          }
        />
        <Combobox.Button
          onClick={() => setQuery("")}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none"
        >
          <FontAwesomeIcon
            icon={faAngleDown}
            className="h-3.5 w-3.5 text-gray-500"
            aria-hidden="true"
          />
        </Combobox.Button>
        {filtered?.length > 0 && (
          <Combobox.Options className="absolute  z-40 mt-1 max-h-40 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filtered?.map((item, index) => (
              <Combobox.Option
                key={index}
                value={item}
                className={({ active }) =>
                  classNames(
                    "relative cursor-default select-none py-2 pl-3 pr-9",
                    active ? "bg-primary text-white" : "text-gray-900"
                  )
                }
              >
                {({ active, selected }) => (
                  <>
                    <span
                      className={classNames(
                        "truncate flex gap-2 items-center",
                        selected && "font-semibold"
                      )}
                    >
                      {item?.image && (
                        <img
                          className="w-8 h-8 rounded-full"
                          src={defaultImage}
                          // src={
                          //   item.image !== null ? item.image.src : defaultImage
                          // }
                          alt={item.imageId !== null ? item.imageId : ""}
                        />
                      )}
                      <p className="capitalize">{item.name}</p>
                    </span>
                    {selected && (
                      <span
                        className={classNames(
                          "absolute inset-y-0 right-0 flex items-center pr-4",
                          active ? "text-white" : "text-primary"
                        )}
                      >
                        <FontAwesomeIcon
                          icon={faCheck}
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
        )}
      </div>
    </Combobox>
  );
}
