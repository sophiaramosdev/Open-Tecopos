import { SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "../../../store/hooks";
import Button from "../../../components/misc/Button";
import Toggle from "../../../components/forms/Toggle";
import useServerBusiness from "../../../api/useServerBusiness";
import { cleanObj } from "../../../utils/helpers";
import GenericTable, { DataTableInterface } from "../../../components/misc/GenericTable";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import Modal from "../../../components/misc/GenericModal";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import Input from "../../../components/forms/Input";
import { ModalAlert } from "../../../components";


const AtAllSalesAreas = () => {

    const [allIps, setNewIp] = useState<{ areaId: number, ip: number }[]>([]);

    const [deleteAccessModal, setDeleteAccessModal] = useState<{
        state: boolean;
        id: number | null;
    }>({ state: false, id: null });

    const { areas } = useAppSelector(state => state.nomenclator)

    const [openNewIdModal, setOpenNewIdModal] = useState(false);

    const { isFetching, updateConfigs } = useServerBusiness()

    const { control, handleSubmit, watch } = useForm();

    const { business } = useAppSelector((state) => state.init);

    let block_production_ticket_to_return!: boolean,
        generate_ticket_for_production_in_fast_orders!: boolean,
        enable_multiple_person_selection_production_areas!: boolean,
        enable_print_ticket_via_lan!: boolean,
        printer_configurations_lan!: string;

    business!.configurationsKey.forEach((item: {
        key: any; value: boolean | string
    }) => {
        switch (item.key) {
            case "block_production_ticket_to_return":
                block_production_ticket_to_return = item.value === "true" ? true : false;
                break;
            case "generate_ticket_for_production_in_fast_orders":
                generate_ticket_for_production_in_fast_orders = item.value === "true" ? true : false;
                break;
            case "enable_multiple_person_selection_production_areas":
                enable_multiple_person_selection_production_areas = item.value === "true" ? true : false;
                break;
            case "enable_print_ticket_via_lan":
                enable_print_ticket_via_lan = item.value === "true" ? true : false;
                break;
            case "printer_configurations_lan":
                printer_configurations_lan = item.value as string;
                break;

        }
    });

    useEffect(() => {
        if (printer_configurations_lan === "") {
            setNewIp([])
        } else {
            setNewIp(JSON.parse(printer_configurations_lan))
        }
    }, [printer_configurations_lan])


    const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (
        data
    ) => {
        const {
            block_production_ticket_to_return,
            enable_multiple_person_selection_production_areas,
            generate_ticket_for_production_in_fast_orders,
            enable_print_ticket_via_lan,
        } = data

        updateConfigs(cleanObj({
            block_production_ticket_to_return,
            enable_multiple_person_selection_production_areas,
            generate_ticket_for_production_in_fast_orders,
            enable_print_ticket_via_lan,
            printer_configurations_lan: JSON.stringify(allIps)
        }))

    };

    const addingNewIp: SubmitHandler<Record<string, string | number | boolean | string[]>> = (
        data
    ) => {

        const { areaId, ip } = data

        if (printer_configurations_lan === "" && allIps.length === 0) {
            setNewIp([{ areaId, ip } as { areaId: number, ip: number }])
            setOpenNewIdModal(false)
        } else {
            const all = [...allIps, { areaId, ip } as { areaId: number, ip: number }]
            setNewIp(all)
            setOpenNewIdModal(false)
        }

    };

    const tableTitles = ["Area", "IP"]
    const tableData: DataTableInterface[] = [];

    allIps.forEach((elem) => {
        tableData.push({
            payload: {
                "Area": areas.find(area => area.id === elem.areaId)?.name,
                "IP": elem.ip
            },
            rowId: elem.areaId
        })
    })

    const actions: BtnActions[] = [
        {
            title: "Añadir IP",
            action: () => setOpenNewIdModal(true),
            icon: <PlusIcon className="h-5" />,
        }
    ];

    const rowAction = (id: number) => setDeleteAccessModal({ state: true, id })

    return (
        <>
            <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">

                <form onSubmit={handleSubmit(onSubmit)}>

                    <Toggle name='enable_multiple_person_selection_production_areas' control={control} defaultValue={enable_multiple_person_selection_production_areas} title='Habilitar selección múltiple de personas' />

                    <Toggle name='generate_ticket_for_production_in_fast_orders' control={control} defaultValue={generate_ticket_for_production_in_fast_orders} title='Generar tickets para producción en las órdenes rápidas' />

                    <Toggle name='block_production_ticket_to_return' control={control} defaultValue={block_production_ticket_to_return} title='Bloquear posibilidad de retornar ticket de producción' />

                    <Toggle name='enable_print_ticket_via_lan' control={control} defaultValue={enable_print_ticket_via_lan} title='Habilitar impresión de tickets vía LAN' />

                    {(watch("enable_print_ticket_via_lan") ?? enable_print_ticket_via_lan) &&
                        <div className="mt-10 w-1/2">
                            <GenericTable
                                tableTitles={tableTitles}
                                tableData={tableData}
                                actions={actions}
                                rowActionDeleteIcon
                                rowAction={rowAction}
                            />
                        </div>
                    }

                    <div className="flex justify-end self-end py-5">
                        <Button
                            color="slate-600"
                            name="Actualizar"
                            type="submit"
                            loading={isFetching}
                            disabled={isFetching}
                        />
                    </div>
                </form>
            </div>

            {openNewIdModal && (
                <Modal state={openNewIdModal} close={setOpenNewIdModal} >
                    <form onSubmit={handleSubmit(addingNewIp)}>
                        <div className="flex">
                            <div>
                                <AsyncComboBox
                                    name="areaId"
                                    label="Area"
                                    control={control}
                                    dataQuery={{
                                        url: "/administration/area",
                                        // defaultParams: { type: "ACCESSPOINT" }
                                    }}
                                    normalizeData={{ id: "id", name: "name" }}
                                    rules={{ required: "Este campo es requerido" }}
                                />
                            </div>

                            <div className="ml-10">
                                <Input
                                    name='ip'
                                    control={control}
                                    label='IP'
                                    type="text"
                                    numbersAndDots={true}
                                    placeholder="xxx xxx xxx xxx"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end self-end py-5">
                            <Button
                                color="slate-600"
                                type="submit"
                                name="Añadir"
                            />
                        </div>
                    </form>

                </Modal>
            )}

            {deleteAccessModal.state && (
                <ModalAlert
                    type={""}
                    title="Eliminar IP"
                    text="¿Está seguro de querer eliminar el IP?"
                    onClose={() => setDeleteAccessModal({ state: false, id: null })}
                    onAccept={() => {
                        setNewIp(allIps.filter(ips => ips.areaId !== deleteAccessModal.id))
                        setDeleteAccessModal({ state: false, id: null })
                    }}
                    isLoading={null}
                />
            )}

        </>
    )
}

export default AtAllSalesAreas
