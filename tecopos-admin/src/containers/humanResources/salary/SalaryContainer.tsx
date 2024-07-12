import {  UserGroupIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import { TabsAttr } from "../../../components/navigation/TabNav";
import ListRules from "./rules/ListRules";
import SideNav from "../../../components/misc/SideNav";
import Generator from "./all/Generator";

const SalaryContainer = () => {
  const [tab, setTab] = useState<string>("all");
  const tabs: TabsAttr[] = [
    { current: tab === "all", name: "Todos", href: "all" },
    { current: tab === "rules", name: "Reglas", href: "rules" },
  ];

  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Capital humano",
    },
    {
      name: "Salario",
    },
  ];
  //------------------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<UserGroupIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <div className="sm:grid grid-cols-10 gap-3">
        <SideNav
          tabs={tabs}
          action={setTab}
          className="col-span-10 sm:col-span-2"
        />
        <div className="sm:col-span-8 pl-3 pt-1">
          {tab === "all" && <Generator />}
          {tab === "rules" && <ListRules />}
        </div>
      </div>
    </>
  );
};

export default SalaryContainer;
