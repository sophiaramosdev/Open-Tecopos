import { Menu, Transition } from "@headlessui/react";
import { DotsVerticalOutline } from "heroicons-react";
import { ChevronLeft, ChevronRight } from "heroicons-react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  parseISO,
  startOfToday,
} from "date-fns";
import { Fragment, useState, useEffect } from "react";
import APIServer from "../../api/APIServices";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Loading } from "..";
import SpinnerLoading from "../misc/SpinnerLoading";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function CalendarEconomicCycle(props) {
  const { setShowDate } = props;
  let today = startOfToday();
  let [selectedDay, setSelectedDay] = useState(today);
  let [currentMonth, setCurrentMonth] = useState(format(today, "MMM-yyyy"));
  let firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
  const [economiccycle, setEconomiccycle] = useState([]);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (selectedDay) {
      setIsFetching(true)
      APIServer.get(`/administration/economiccycle?isActive=false&dateFrom=${format(selectedDay, "yyyy-MM-dd")}&dateTo=${format(selectedDay, "yyyy-MM-dd")}`)
        .then((ecoCycl) => {
          setEconomiccycle(ecoCycl.data.items);
          setLoading(false);
          setIsFetching(false)
        })
        .catch(() => {
          toast.error("Error al obtener los ciclo economico");
        });
   }
   }, [selectedDay]); 

  let days = eachDayOfInterval({
    start: firstDayCurrentMonth,
    end: endOfMonth(firstDayCurrentMonth),
  });

  function previousMonth() {
    let firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }

  function nextMonth() {
    let firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }

  let selectedDayeconomiccycle = economiccycle.filter((meeting) =>
    isSameDay(parseISO(meeting.openDate), selectedDay)
  );
  if(loading) return <div className="h-96"><Loading loading={false} /></div> 
  return (
    <div className="">
      <div className="max-w-md px-4 mx-auto sm:px-7 md:max-w-4xl md:px-6">
          <div className="md:grid md:grid-cols-2 md:divide-x md:divide-gray-200">
            <div className="md:pr-14">
              <div className="flex items-center">
                <h2 className="flex-auto font-semibold text-gray-900">
                  {format(firstDayCurrentMonth, "MMMM yyyy")}
                </h2>
                <button
                  type="button"
                  onClick={previousMonth}
                  className="-my-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Previous month</span>
                  <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  onClick={nextMonth}
                  type="button"
                  className="-my-1.5 -mr-1.5 ml-2 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Next month</span>
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-7 mt-10 text-xs leading-6 text-center text-gray-500">
                <div>D</div>
                <div>L</div>
                <div>M</div>
                <div>M</div>
                <div>J</div>
                <div>V</div>
                <div>S</div>
              </div>
              <div className="grid grid-cols-7 mt-2 text-sm">
                {days.map((day, dayIdx) => (
                  <div
                    key={day.toString()}
                    className={classNames(
                      dayIdx === 0 && colStartClasses[getDay(day)],
                      "py-1.5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={classNames(
                        isEqual(day, selectedDay) && "text-white",
                        !isEqual(day, selectedDay) &&
                          isToday(day) &&
                          "text-red-500",
                        !isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          isSameMonth(day, firstDayCurrentMonth) &&
                          "text-gray-900",
                        !isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          !isSameMonth(day, firstDayCurrentMonth) &&
                          "text-gray-400",
                        isEqual(day, selectedDay) &&
                          isToday(day) &&
                          "bg-red-500",
                        isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          "bg-gray-900",
                        !isEqual(day, selectedDay) && "hover:bg-gray-200",
                        (isEqual(day, selectedDay) || isToday(day)) &&
                          "font-semibold",
                        "mx-auto flex h-8 w-8 items-center justify-center rounded-full"
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>
                        {format(day, "d")}
                      </time>
                    </button>

                    <div className="w-1 h-1 mx-auto mt-1">
                      {economiccycle.some((meeting) =>
                        isSameDay(parseISO(meeting.openDate), day)
                      ) && (
                        <div className="w-1 h-1 rounded-full bg-sky-500"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <section className="mt-12 md:mt-0 md:pl-14">
              <h2 className="font-semibold text-gray-900">
                Ciclos Económicos{" "}
                <time dateTime={format(selectedDay, "yyyy-MM-dd")}>
                  {format(selectedDay, "MMM dd, yyy")}
                </time>
              </h2>
              {isFetching && <div className="flex items-center justify-center mt-8"><SpinnerLoading text={"Obteniendo ciclos económicos..."}/></div> }
              <ol className="mt-4 space-y-2 text-sm leading-6 text-gray-500">
                {selectedDayeconomiccycle.length > 0 ? (
                  selectedDayeconomiccycle?.map((meeting) => {
                  const fullMeetingData = economiccycle.find(ecoCycleItem => ecoCycleItem.id === meeting.id);

                   return <Meeting
                      navigate={navigate}
                      meeting={meeting}
                      key={meeting.id}
                      setShowDate={setShowDate}
                      openedBy={fullMeetingData?.openBy}
                      closedBy={fullMeetingData?.closedBy}
                    />
                  })
                ) : (
                  !isFetching && <p className="text-sm font-medium mt-28">No hay ciclos económicos en esta fecha</p>
                )}
              </ol>
            </section>
          </div>
      </div>
    </div>
  );
}

function Meeting({ meeting, setShowDate, navigate , openedBy, closedBy }) {
  let openDate = parseISO(meeting.openDate);
  let closedDate = parseISO(meeting.closedDate);
  return (
    <li className="flex items-center px-4 py-2 shadow space-x-4 group rounded-xl focus-within:bg-gray-100 hover:bg-gray-100">
      <div className="flex-auto">
        <p className="text-gray-900">{meeting.name}</p>
        <p className="mt-0.5">
          Iniciado por: {openedBy?.displayName} <br/>
          Cerrado por: {closedBy?.displayName} <br/>
          <time dateTime={meeting.openDate}>{format(openDate, "h:mm a")}</time> -
          <time dateTime={meeting.closedDate}>
            {format(closedDate, "h:mm a")}
          </time>
        </p>
      </div>
      <Menu
        as="div"
        className="relative opacity-0 focus-within:opacity-100 group-hover:opacity-100"
      >
        <div>
          <Menu.Button className="-m-2 flex items-center rounded-full p-1.5 text-gray-500 hover:text-gray-600">
            <span className="sr-only">Open options</span>
            <DotsVerticalOutline className="w-6 h-6" aria-hidden="true" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0  z-40 mt-2 origin-top-right bg-white rounded-md shadow-lg w-36 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDate(false);
                      navigate(`/ecocycle/${meeting.id}`);
                    }}
                    className={classNames(
                      active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                      "block px-4 py-2 text-sm"
                    )}
                  >
                    Administrar
                  </button>
                )}
              </Menu.Item>
              {/*<Menu.Item>
                {({ active }) => (
                  <button
                    href="#"
                    className={classNames(
                      active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                      "block px-4 py-2 text-sm"
                    )}
                  >
                    Eliminar
                  </button>
                )}
                    </Menu.Item>*/}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </li>
  );
}

let colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
];
