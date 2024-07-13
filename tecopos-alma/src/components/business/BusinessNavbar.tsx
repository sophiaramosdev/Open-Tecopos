import { Link, useLocation, useNavigate } from "react-router-dom";

type PrivateProp = {currentLocation:string};

function classNames(...classes: Array<string>) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar({currentLocation}:PrivateProp) {
  const location = useLocation();
  const goTo = useNavigate();

  const tabs = [
    {
      name: "Detalles",
      href: "details",
      current: currentLocation === "details",
    },
    {
      name: "Resumen",
      href: "resume",
      current: currentLocation === "resume",
    },
    {
      name: "Facturación",
      href: "facturation",
      current: currentLocation === "facturation",
    },
    {
      name: "Usuarios",
      href: "users",
      current: currentLocation === "users",
    },
  ];

  return (
    <div className="my-1">
      <div className="md:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block mx-auto w-1/2 rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-md placeholder:text-center"
          onChange={(e) => goTo(e.target.value)}
        >
          {tabs.map((tab) => (
            <option id={tab.href} key={tab.name} value={tab.href} >
              {tab.name}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden md:flex md:flex-1 justify-center">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <Link
                to={tab.href}
                key={tab.name}
                className={classNames(
                  tab.current
                    ? "border-primary text-pimary"
                    : "border-transparent text-gray-500 hover:text-secondary hover:border-secondary",
                  "whitespace-nowrap py-4 px-5 border-b-2 font-medium text-md"
                )}
                aria-current={tab.current ? "page" : undefined}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
