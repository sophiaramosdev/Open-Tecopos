import { useParams } from "react-router-dom";
import useServerArea from "../../../api/useServerArea";
import { formatCurrency } from "../../../utils/helpers";

import { useEffect, useState } from 'react'
import { SummaryStockList } from "../../../components/misc/SummaryStockList";
import ScrollTypeFilter from "../../../components/misc/ScrollTypeFilter";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../store/hooks";

const Summary = () => {

    const { stockId } = useParams();

    const {
        getStockAreaData,
        quickProductReport,
        isLoading,
    } = useServerArea();


    useEffect(() => {
        stockId && getStockAreaData(stockId, { page: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const { business } = useAppSelector(state => state.init)


    const dataBody = {
        "Tipos de productos": quickProductReport?.total_products_type ?? 0,
        "Total invertido": formatCurrency(
            quickProductReport?.total_cost.amount ?? 0,
            quickProductReport?.total_cost.codeCurrency,
            2
        ),
        "Venta estimada": formatCurrency(
            quickProductReport?.total_estimated_sales.amount ?? 0,
            quickProductReport?.total_estimated_sales.codeCurrency,
            2
        ),
        "Ganancia estimada": formatCurrency(
            quickProductReport?.total_estimated_profits.amount ?? 0,
            quickProductReport?.total_estimated_profits.codeCurrency,
            2
        ),

    }

    const [filter, setFilter] =
        useState<Record<string, string | number | boolean | null>>({ activeCurrency: 'CUP' });

    //Data for Filter Scroll -------------------------------------------------
    let currencies: SelectInterface[] = [];
    business?.availableCurrencies.map((item) =>
        currencies.push({ id: item.code, name: item.name })
    );


    return (
        <>
            <ScrollTypeFilter
                title="Monedas"
                items={currencies}
                current={(filter?.activeCurrency) ?? null}
                onChange={(item: string | number | null) =>
                    setFilter({
                        ...filter,
                        activeCurrency: currencies.find(curr => curr.id === item)?.id ?? "CUP",
                    })
                }
                allButtonDisabled
            />

            <SummaryStockList body={dataBody} isLoading={isLoading} lastRowColor={(quickProductReport?.total_estimated_profits.amount ?? 0) >= 0
                ? "green-500"
                : "red-500"} activeCurrency={(filter?.activeCurrency as string) ?? "CUP"} />
        </>

    )
}

export default Summary
