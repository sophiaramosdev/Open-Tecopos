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
import { toast } from "react-toastify";
import APIServer from "../../../../api/APIServices";
import { Loading } from "../../../../components";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";


function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function CalendarEconomicCycle({ setShowDate , setValue , setEconCiclSelected}) {
  let today = startOfToday();
  let [selectedDay, setSelectedDay] = useState(today);
  let [currentMonth, setCurrentMonth] = useState(format(today, "MMM-yyyy"));
  let firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
  const [economiccycle, setEconomiccycle] = useState([]);

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
              <h3 className="text-xs font-medium mt-4">Seleccione un ciclo económico:</h3>
              {isFetching && <div className="flex items-center justify-center mt-8"><SpinnerLoading text={"Obteniendo ciclos económicos..."}/></div> }
              <ol className="mt-4 space-y-2 text-sm leading-6 text-gray-500">
                {selectedDayeconomiccycle.length > 0 ? (
                  selectedDayeconomiccycle?.map((meeting) => {
                  const fullMeetingData = economiccycle.find(ecoCycleItem => ecoCycleItem.id === meeting.id);

                   return <Meeting
                   setEconCiclSelected={setEconCiclSelected}
                      setValue={setValue}
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
/*A*/
function Meeting({ meeting, setShowDate, navigate , openedBy, closedBy ,setValue ,setEconCiclSelected}) {
  let openDate = parseISO(meeting.openDate);
  let closedDate = parseISO(meeting.closedDate);
  return (
    <li onClick={() => {
      setShowDate(false);
      setValue('economicCycleId',meeting.id)
      setEconCiclSelected(meeting)
    }}  className="flex items-center hover:cursor-pointer px-4 py-2 shadow space-x-4 group rounded-xl focus-within:bg-gray-100 hover:bg-gray-100">
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
