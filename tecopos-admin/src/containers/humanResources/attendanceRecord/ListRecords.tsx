
import { SubmitHandler, useForm } from 'react-hook-form';
import DateInput from '../../../components/forms/DateInput';
import Button from '../../../components/misc/Button';
import useServerUsers from '../../../api/useServerUsers';
import { BasicType } from '../../../interfaces/InterfacesLocal';
import GenericTable, { DataTableInterface } from '../../../components/misc/GenericTable';
import { DayAsistanceInterface } from '../../../interfaces/ServerInterfaces';
import { useAppSelector } from '../../../store/hooks';


const ListRecords = () => {

    const { business } = useAppSelector(state => state.init)

    const { getDayAsistance, isLoading, allDaysAsistance } = useServerUsers()

    const { handleSubmit, control } = useForm();

    const onSubmit: SubmitHandler<BasicType> = (data) => {

        if (business?.mode === "GROUP") {
            //@ts-ignore
            getDayAsistance({
                ...data,
                businessId: business.id
            })
        } else {
            //@ts-ignore
            getDayAsistance(data)
        }
    };



    return (
        <div className=' mx-auto  py-3 px-4 sm:py-3 sm:px-3  '>
            <form onSubmit={handleSubmit(onSubmit)} className='py-2'>
                <div className='h-50 border border-slate-300 rounded p-2 overflow-y-visible'>
                    <div className='h-50'>
                        <div className='md:grid md:grid-cols-2 md:gap-2'>
                            <div className='py-2'>
                                <DateInput
                                    name='dateFrom'
                                    label='Fecha *'
                                    control={control}
                                    rules={{ required: 'Este campo es requerido' }}
                                    untilToday
                                />
                            </div>
                        </div>
                    </div>

                    <div className='px-4 py-3 bg-slate-50 text-right sm:px-6'>
                        <Button
                            color='gray-600'
                            type='submit'
                            name={isLoading ? 'Buscando...' : 'Buscar'}
                            loading={isLoading}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </form>

            {
                allDaysAsistance.length > 0 && (
                    <AllDaysAsistance allDaysAsistance={allDaysAsistance} />
                )
            }

        </div>
    )
}

export default ListRecords


const AllDaysAsistance = ({ allDaysAsistance }: { allDaysAsistance: DayAsistanceInterface[] }) => {

    const tableTitle = ["Nombre", "Cargo", "Entradas", "Salidas"];
    const tableData: DataTableInterface[] = [];
    allDaysAsistance.map((item) =>
        tableData.push({
            rowId: item?.person?.id,
            payload: {
                "Nombre": (item?.person?.firstName ?? " ") + " " + (item?.person?.lastName ?? " "),
                Cargo: item?.person?.post?.name ? item?.person?.post?.name : " ",
                Entradas:
                    (
                        <div className='flex flex-col'>
                            {
                                item?.entries?.map((element, idx) => (
                                    <div key={idx}>
                                        {element}
                                    </div>
                                ))
                            }
                        </div>
                    ),
                Salidas: (
                    <div className='flex flex-col'>
                        {
                            item?.exits?.map((element, idx) => (
                                <div key={idx}>
                                    {element}
                                </div>
                            ))
                        }
                    </div>
                )
            },
        })
    );

    return (
        <GenericTable
            tableTitles={tableTitle}
            tableData={tableData}
        />
    )
}