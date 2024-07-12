import React, { useEffect, useState } from 'react'
import { PersonInterface } from '../../../../interfaces/ServerInterfaces';
import useServerUsers from '../../../../api/useServerUsers';
import GenericTable, { DataTableInterface } from '../../../../components/misc/GenericTable';
import Paginate from '../../../../components/misc/Paginate';
import { formatCalendar } from '../../../../utils/helpers';
import { printPriceWithCommasAndPeriods } from '../../../../utils/functions';

interface EditSaalriesInterface {
    person: PersonInterface | null;
}

const EditSalaries = ({ person }: EditSaalriesInterface) => {

    const { findAllPersonSalary, AllPersonSalary, paginate, isLoading } = useServerUsers()

    const [filter, setFilter] = useState<Record<string, string | number | boolean>>({ page: 1 });

    useEffect(() => {
        findAllPersonSalary(person?.id!, filter)
    }, [])

    useEffect(() => {
        findAllPersonSalary(person?.id!, filter)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);


    const tableTitle = ["Nombre", "Fecha", "Días trabajados", "Total", "Conformidad"];
    const tableData: DataTableInterface[] = [];
    AllPersonSalary?.forEach(personSalary => {
        tableData.push({
            rowId: personSalary?.id,
            payload: {
                "Nombre": (JSON.parse(personSalary.personalData)?.person?.firstName ?? "") + " " + (JSON.parse(personSalary.personalData)?.person?.lastName ?? ""),
                "Fecha": formatCalendar(personSalary?.createdAt),
                "Días trabajados": JSON.parse(personSalary.personalData)?.listEconomicCycles.length,
                "Total": printPriceWithCommasAndPeriods(personSalary?.totalToPay) + " " + personSalary?.codeCurrency,
                "Conformidad": personSalary?.accordance,
            },
        })
    })
    return (
        <div>
            <GenericTable
                tableTitles={tableTitle}
                tableData={tableData}
                loading={isLoading}
                paginateComponent={
                    <Paginate
                        action={(page: number) => setFilter({ ...filter, page })}
                        data={paginate}
                    />
                }
            />
        </div>
    )
}

export default EditSalaries
