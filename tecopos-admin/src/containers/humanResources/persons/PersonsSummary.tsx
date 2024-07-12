import { useEffect } from 'react'
import GenericList from '../../../components/misc/GenericList'
import { Pie } from 'react-chartjs-2';
import { colorFunction } from '../../../utils/helpers';
import { useAppSelector } from '../../../store/hooks';
import { SelectInterface } from '../../../interfaces/InterfacesLocal';
import useServerUsers from '../../../api/useServerUsers';
import GenericTable, { DataTableInterface } from '../../../components/misc/GenericTable';
import LoadingSpin from '../../../components/misc/LoadingSpin';


const PersonsSummary = () => {

    const {
        isLoading,
        humanresourceSummary,
        getHumanResourcesSummary
    } = useServerUsers();

    useEffect(() => {
        getHumanResourcesSummary()
    }, [])


    const { business, branches } = useAppSelector(state => state.init)

    const dataBody = {
        "Cantidad de trabajadores": <p>{humanresourceSummary?.totalPeopleActive}</p>,
        "En el negocio": <p>{humanresourceSummary?.inBusiness}</p>,
    }


    const branchSelector: SelectInterface[] = branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
    }));

    branchSelector.push({ name: business?.name!, id: business?.id! })


    //Grafico 1 ----------------------------------------------------------------------------------------------------------------------------------------------
    // Datos por Sexo
    const incomesSex = ["Masculino", "Femenino", "Sexo no definido"];
    const incomesSexTotal = [humanresourceSummary?.males, humanresourceSummary?.females, humanresourceSummary?.notSexDefined];
    const colorIncomesPieSex = ["#FF0000", "#0000FF", "#FFC0CB"];
    // Configuración del gráfico
    const categorySexData = {
        labels: incomesSex,
        datasets: [
            {
                label: "Datos por cargos",
                data: incomesSexTotal,
                backgroundColor: colorIncomesPieSex
                ,
                datalabels: {
                    color: "black",
                    //@ts-ignore
                    formatter: (_, ctx) => {
                        return `${incomesSex[ctx.dataIndex]}`;
                    },
                },
            },
        ],
    };
    // Configuración de tooltips
    const categorySexOptions = {
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const value = context.raw;
                        const percentage = ((value / incomesSexTotal?.reduce((sum, val) => sum! + val!, 0)!) * 100).toFixed(2);
                        return `${value} (${percentage}%)`;
                    },
                },
            },
        },
    };


    //Grafico 4 ----------------------------------------------------------------------------------------------------------------------------------------------
    // Datos por Negocio
    const incomesBusiness = humanresourceSummary?.listBusiness.map(item => item.businessName);
    const incomesBusinessTotal = humanresourceSummary?.listBusiness.map(item => item.quantity);
    const colorIncomesPieBusiness = colorFunction(humanresourceSummary?.listBusiness?.length!);
    // Configuración del gráfico
    const categoryBusinessData = {
        labels: incomesBusiness,
        datasets: [
            {
                label: "Datos por negocio",
                data: incomesBusinessTotal,
                backgroundColor: colorIncomesPieBusiness
                ,
                datalabels: {
                    color: "black",
                    //@ts-ignore
                    formatter: (_, ctx) => {
                        return `${incomesBusiness![ctx.dataIndex]}`;
                    },
                },
            },
        ],
    };
    // Configuración de tooltips
    const categoryBusinessOptions = {
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const value = context.raw;
                        const percentage = ((value / incomesBusinessTotal?.reduce((sum, val) => sum! + val!, 0)!) * 100).toFixed(2);
                        return `${value} (${percentage}%)`;
                    },
                },
            },
        },
    };


    const dataBodyHistorical = {
        "Total general": <p>{humanresourceSummary?.totalGeneral}</p>,
        "Han causado baja": <p>{humanresourceSummary?.totalPeopleInactive}</p>,
    }

    const tableTitlesPostTable = [
        "Nombre",
        "Cantidad"
    ];

    const tableDataPost: DataTableInterface[] = [];

    humanresourceSummary?.listPosts.forEach(item => {

        tableDataPost.push({
            rowId: item.id,
            payload: {
                Nombre: item.postName === "undefined" ? "Sin definir" : item.postName,
                Cantidad: item.quantity ?? 1,
            },
        })

    })

    const tableDataCategories: DataTableInterface[] = [];

    humanresourceSummary?.listCategories.forEach(item => {

        tableDataCategories.push({
            rowId: item.id,
            payload: {
                Nombre: item.categoriesName === "undefined" ? "Sin definir" : item.categoriesName,
                Cantidad: item.quantity ?? 1,
            },
        })

    })

    return (

        <>
            {isLoading ? <div className='w-full flex justify-center items-center'>
                <LoadingSpin color='black' />
            </div>
                :
                <div>
                    <p className="text-lg font-semibold ml-2 mb-2">Activos</p>
                    <GenericList
                        body={dataBody}
                        isLoading={isLoading}
                    />

                    <p className="text-sm font-semibold p-4">Cargos</p>
                    <GenericTable
                        tableTitles={tableTitlesPostTable}
                        tableData={tableDataPost.sort((a, b) => {
                            //@ts-ignore
                            const porcentajeA = parseFloat(a.payload["Cantidad"]);
                            //@ts-ignore
                            const porcentajeB = parseFloat(b.payload["Cantidad"]);

                            return porcentajeB - porcentajeA;
                        })}
                    />

                    <p className="text-sm font-semibold p-4">Categorías</p>
                    <GenericTable
                        tableTitles={tableTitlesPostTable}
                        tableData={tableDataCategories.sort((a, b) => {
                            //@ts-ignore
                            const porcentajeA = parseFloat(a.payload["Cantidad"]);
                            //@ts-ignore
                            const porcentajeB = parseFloat(b.payload["Cantidad"]);

                            return porcentajeB - porcentajeA;
                        })}
                    />

                    <div className="w-full flex justify-evenly items-center p-4">
                        <div className="flex flex-col items-center justify-center">
                            <p className="text-lg font-semibold">Por sexo</p>
                            <Pie data={categorySexData} options={categorySexOptions} />
                        </div>

                        <div className="flex flex-col items-center justify-center">
                            <p className="text-lg font-semibold">Por negocio</p>
                            <Pie data={categoryBusinessData} options={categoryBusinessOptions} />
                        </div>
                    </div>

                    <p className="text-lg font-semibold ml-2 my-2">Histórico</p>
                    <GenericList
                        body={dataBodyHistorical}
                        isLoading={isLoading}
                    />
                </div>

            }
        </>

    )
}

export default PersonsSummary
