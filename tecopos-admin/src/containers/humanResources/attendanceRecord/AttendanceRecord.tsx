
import { useState, lazy } from "react"
import SideNav from "../../../components/misc/SideNav";
// import ListAccessRecord from "../ListAccessRecord";
import ListRecords from "./ListRecords";
import Breadcrumb, { PathInterface } from "../../../components/navigation/Breadcrumb";
import { UserGroupIcon } from "@heroicons/react/24/outline";
const ListAccessRecord = lazy(() => import("../ListAccessRecord"));

const AttendanceRecord = () => {

    const [currentTab, setCurrentTab] = useState("all");
    const tabs = [
        {
            //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
            name: "Todos",
            href: "all",
            current: currentTab === "all",
        },
        {
            //icon: <BanknotesIcon className="h-6" />,
            name: "Reportes",
            href: "reports",
            current: currentTab === "reports",
        }
    ];

    //Breadcrumb-----------------------------------------------------------------------------------
    const paths: PathInterface[] = [
        {
            name: "Capital humano",
        },
        {
            name: "Registro de asistencia",
        },
        {
            name: tabs.find(tab => tab.current)?.name! ?? ""
        }
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
                    action={setCurrentTab}
                    className="col-span-10 sm:col-span-2"
                />
                <div className='sm:col-span-8 pl-3 pt-1'>
                    {currentTab === 'all' && <ListAccessRecord />}
                    {currentTab === 'reports' && <ListRecords />}

                </div>

            </div>

        </>
    )
}

export default AttendanceRecord
