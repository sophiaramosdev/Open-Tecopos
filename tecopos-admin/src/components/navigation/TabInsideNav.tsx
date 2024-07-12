type TabsAttr = {
  icon?: React.ReactNode;
  name: string;
  href: string;
  current: boolean;
};

interface TabNavProp {
  tabs: TabsAttr[];
  action: Function;
}
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function TabInsideBar({ tabs, action }: TabNavProp) {
  return (
    <div className="mt-3">
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-slate-500 focus:ring-slate-500"
          defaultValue={tabs.find((tab) => tab.current)?.name}
          onChange={(value) => action(value)}
        >
          {tabs.map((tab) => (
            <option key={tab.name}>{tab.name}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <nav
          className="isolate flex divide-x divide-gray-200 rounded-lg shadow"
          aria-label="Tabs"
        >
          {tabs.map((tab, tabIdx) => (
            <p
              key={tab.name}
              className={classNames(
                tab.current
                  ? "text-gray-900 bg-gray-300"
                  : "text-gray-500 hover:text-gray-500 bg-white",
                tabIdx === 0 ? "rounded-l-lg" : "",
                tabIdx === tabs.length - 1 ? "rounded-r-lg" : "",
                "group relative min-w-0 flex-1 overflow-hidden  py-4 px-4 text-center text-sm font-medium focus:z-10 cursor-pointer shadow-md"
              )}
              onClick={() => action(tab.href)}
              aria-current={tab.current ? "page" : undefined}
            >
              <span>{tab.name}</span>
              
            </p>
          ))}
        </nav>
      </div>
    </div>
  );
}
