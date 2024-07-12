import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { SelectInterface } from "../../interfaces/InterfacesLocal";

interface ScrollTypeFilterProp {
  title: string;
  items: SelectInterface[];
  onChange: Function;
  current: string | number | boolean | string | null;
  allButtonDisabled?: boolean;
  scrollbarDisabled?: boolean;
  allButtonEnd?: boolean;
  className?: string;
}

const ScrollTypeFilter = ({
  title,
  items,
  current,
  onChange,
  allButtonDisabled,
  scrollbarDisabled = true,
  allButtonEnd,
  className
}: ScrollTypeFilterProp) => {
  const slideLeft = () => {
    let slider = document.getElementById("slider-" + title);
    if (slider !== null) slider.scrollLeft -= 500;
  };

  const slideRight = () => {
    let slider = document.getElementById("slider-" + title);
    if (slider !== null) slider.scrollLeft += 500;
  };
  return (
    <div className={`${className ? className : "my-6"}`}>
      <h4 className="mt-5 pl-5 font-medium text-lg text-gray-900">{title}</h4>
      <div className="relative flex items-center">
        <FontAwesomeIcon
          icon={faChevronLeft}
          className="opacity-50 cursor-pointer hover:opacity-100"
          onClick={slideLeft}
          size={"lg"}
        />
        <div
          id={`slider-${title}`}
          className={`flex align-middle w-full h-full overflow-x-scroll whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-gray-100 pt-2 pb-4 ${
            scrollbarDisabled ? `scrollbar-none` : ""
          }`}
        >
          {!allButtonDisabled && (
            <button
              className={`flex items-center  border-2 py-1 px-5 rounded-full hover:scale-105 ease-in-out duration-300 m-1 cursor-pointer ${
                current !== null
                  ? "border-gray-300"
                  : "bg-gray-600 text-white  border-gray-900"
              }`}
              type="button"
              onClick={() => {
                onChange(null);
              }}
            >
              Todos
            </button>
          )}

          {items.map((item, index) => (
            <button
              key={index}
              className={`flex items-center  border-2 py-1 px-5 rounded-full hover:scale-105 ease-in-out duration-300 m-1 cursor-pointer ${
                current !== item.id
                  ? " border-gray-300  "
                  : "bg-gray-600 text-white  border-gray-900"
              }`}
              type="button"
              onClick={() => {
                onChange(item.id);
              }}
            >
              {item.name}
            </button>
          ))}

          { allButtonEnd && (
            <button
              className={`flex items-center  border-2 py-1 px-5 rounded-full hover:scale-105 ease-in-out duration-300 m-1 cursor-pointer ${
                current !== null
                  ? "border-gray-300"
                  : "bg-gray-600 text-white  border-gray-900"
              }`}
              type="button"
              onClick={() => {
                onChange(null);
              }}
            >
              Todos
            </button>
          )}
        </div>
        <FontAwesomeIcon
          icon={faChevronRight}
          className="opacity-50 cursor-pointer hover:opacity-100"
          onClick={slideRight}
          size={"lg"}
        />
      </div>
    </div>
  );
};

export default ScrollTypeFilter;
