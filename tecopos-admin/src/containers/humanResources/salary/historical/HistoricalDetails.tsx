import { BanknotesIcon } from "@heroicons/react/24/outline"
import Breadcrumb, { PathInterface } from "../../../../components/navigation/Breadcrumb"
import { useNavigate, useParams } from "react-router-dom";
import { useState, createContext, useEffect } from "react";
import SideNav from "../../../../components/misc/SideNav";
import Results from "./historicalDetailsTabs/Results";
import Summary from "./historicalDetailsTabs/Summary";
import Export from "./historicalDetailsTabs/Export";
import Details from "./historicalDetailsTabs/Details";
import { SalaryReport } from "../../../../interfaces/ServerInterfaces";
import useServerUsers from "../../../../api/useServerUsers";
import LoadingSpin from "../../../../components/misc/LoadingSpin";

interface DispatchContextInterface {
    HistoricalDetailsData: SalaryReport;
    setHistoricalDetailsData: any;
}

export const DispatchContext = createContext<Partial<DispatchContextInterface>>(
    {}
);

const HistoricalDetails = () => {

    const navigate = useNavigate();
    const { historicalID, historicalName } = useParams();

    const {
        isLoading,
        HistoricalSalaryData,
        GetHistorialSalary
    } = useServerUsers();

    const [HistoricalDetailsData, setHistoricalDetailsData] = useState<SalaryReport>()

    useEffect(() => {
        GetHistorialSalary(parseInt(historicalID!))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setHistoricalDetailsData(HistoricalSalaryData!)
    }, [HistoricalSalaryData])



    //Breadcrumb-----------------------------------------------------------------------------------
    const paths: PathInterface[] = [
        {
            name: "Salario",
        },
        {
            name: "Históricos",
            action: () => navigate(`/salary/historical`)
        },
        {
            name: historicalName ?? "",
        },
    ];

    const [currentHistoricalDetailTab, setCurrentHistoricalDetailTab] = useState("summary");

    const historicalDetailsTabs = [
        {
            name: "Resumen",
            href: "summary",
            current: currentHistoricalDetailTab === "summary",
        },
        {
            name: "Detalles",
            href: "details",
            current: currentHistoricalDetailTab === "details",
        },
        {
            name: "Nómina",
            href: "results",
            current: currentHistoricalDetailTab === "results",
        },
        {
            name: "Exportar",
            href: "export",
            current: currentHistoricalDetailTab === "export",
        },
    ];

    const contextValues = {
        HistoricalDetailsData,
        setHistoricalDetailsData
    }

    return (
        <>
            <Breadcrumb
                icon={<BanknotesIcon className="h-6 text-gray-500" />}
                paths={paths}
            />

            {
                (isLoading || HistoricalDetailsData === null) ? (
                    <div className="w-full h-full flex justify-center item-center">
                        <LoadingSpin color="black" />
                    </div>
                ) : (
                    <div className="sm:grid grid-cols-10 gap-3">
                        <SideNav
                            tabs={historicalDetailsTabs}
                            action={setCurrentHistoricalDetailTab}
                            className="col-span-10 sm:col-span-2"

                        />
                        <div className='sm:col-span-8 pl-3 pt-1'>
                            <DispatchContext.Provider
                                value={contextValues}
                            >
                                {<Details show={currentHistoricalDetailTab === "details" ? true : false} />}
                                {<Results show={currentHistoricalDetailTab === "results" ? true : false} />}
                                {<Summary show={currentHistoricalDetailTab === "summary" ? true : false} />}
                                {<Export show={currentHistoricalDetailTab === "export" ? true : false} />}
                                
                            </DispatchContext.Provider>

                        </div>

                    </div>
                )
            }


        </>
    )
}

export default HistoricalDetails
