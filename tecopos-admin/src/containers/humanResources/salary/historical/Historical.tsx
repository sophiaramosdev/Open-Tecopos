import { useEffect, useState } from 'react';
import GenericTable, { DataTableInterface, FilterOpts } from '../../../../components/misc/GenericTable';
import Breadcrumb, { PathInterface } from '../../../../components/navigation/Breadcrumb';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../../../utils/helpers';
import Paginate from '../../../../components/misc/Paginate';
import useServerUsers from '../../../../api/useServerUsers';
import { useNavigate } from 'react-router-dom';

const Historical = () => {

    const navigate = useNavigate();

    const {
        isLoading,
        paginate,
        AllHistoricalSalaries,
        FindAllHistoricalSalary
    } = useServerUsers();

    const [filter, setFilter] = useState<Record<string, string | number | boolean>>({ page: 1 });

    useEffect(() => {
        FindAllHistoricalSalary(filter);
    }, [filter]);

    //Breadcrumb-----------------------------------------------------------------------------------
    const paths: PathInterface[] = [
        {
            name: "Salario",
        },
        {
            name: "Históricos",
        },
    ];

    const tableTitles = [
        "Nombre",
        "Inicio",
        "Fin",
    ];

    const tableData: DataTableInterface[] = [];

    if (AllHistoricalSalaries?.items?.length) {
        const sortedSalaries = AllHistoricalSalaries.items
            .filter(item => item !== undefined)
            .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

        sortedSalaries.forEach(item => {
            tableData.push({
                rowId: item.id,
                payload: {
                    Nombre: item.name,
                    Inicio: formatDate(item?.startsAt),
                    Fin: formatDate(item.endsAt),
                },
            });
        });
    }

    const rowAction = (historicalID: number) => navigate(`/salary/historical/${AllHistoricalSalaries?.items.find(element => element.id === historicalID)?.name === "" ? "Reporte" : AllHistoricalSalaries?.items.find(element => element.id === historicalID)?.name}/${historicalID}`);

    const availableFilters: FilterOpts[] = [
        //Filter by productCategories index 0
        {
            format: "datepicker",
            filterCode: "dateFrom",
            name: "Fecha desde",
            isUntilToday: true
        },
        {
            format: "datepicker",
            filterCode: "dateTo",
            name: "Fecha hasta",
            isUntilToday: true
        }
    ];

    //Filter Action
    const filterAction = (data: Record<string, string | number | boolean> | null) => {
        data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
    };

    let searching = {
        placeholder: "Buscar histórico",
        action: (value: string) =>
          value ? setFilter({ search: value }) : setFilter({ page: 1 }),
      };

    return (
        <>
            <Breadcrumb
                icon={<BanknotesIcon className="h-6 text-gray-500" />}
                paths={paths}
            />

            <GenericTable
                tableTitles={tableTitles}
                tableData={tableData}
                rowAction={rowAction}
                filterComponent={{ availableFilters, filterAction }}
                paginateComponent={
                    <Paginate
                        action={(page: number) => setFilter({ ...filter, page })}
                        data={paginate}
                    />
                }
                loading={isLoading}
                searching={searching}
            />
        </>
    )
}

export default Historical
