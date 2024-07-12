import { PlusIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import useServerUsers from "../../api/useServerUsers";
import GenericTable, {
    DataTableInterface,
} from "../../components/misc/GenericTable";
import Paginate from "../../components/misc/Paginate";
import { exportExcel, formatCalendar, formatDateForReportsWithYear } from "../../utils/helpers";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import Modal from "../../components/misc/GenericModal";
import ExcelFileExport from "../../components/commos/ExcelFileExport";
import ModalAlert from "../../components/commos/ModalAlert";
import NewPersonRecordModal from "./NewPersonRecordModal";
import Button from "../../components/misc/Button";
import { saveAs } from "file-saver";
import { translateActionRecords } from "../../utils/translate";

interface ListAccessRecordInterface {
    id?: number | null;
}

const ListOfRecords = ({ id }: ListAccessRecordInterface) => {

    const {
        getAllPersonRecords,
        personRecords,
        paginate,
        isLoading,
        deleteAccessRecords
    } = useServerUsers();

    const [deleteAccessModal, setDeleteAccessModal] = useState<{
        state: boolean;
        id: number | null;
    }>({ state: false, id: null });

    const [showAccessModal, setShowAccessModal] = useState<{
        state: boolean;
        id: number | null;
    }>({ state: false, id: null });


    const [filter, setFilter] = useState<Record<string, string | number | boolean>>({ page: 1, personId: id !== null ? id as number : false });


    const [exportModal, setExportModal] = useState(false);
    const [newPersonRecord, setNewPersonRecord] = useState(false);

    useEffect(() => {
        if (id !== null) {
            getAllPersonRecords(filter, id!)
        }
        // getAccessRecords(filter)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);


    //Data to dislay in table ---------------------------------------------------------------------------
    const tableTitle = ["Fecha", "Registrado por", "Tipo de acción", "Documento anexado"];

    const tableData: DataTableInterface[] = [];
    personRecords.forEach((item) =>
        tableData.push({
            rowId: item.id,
            payload: {
                Fecha: formatCalendar(item.createdAt),
                "Registrado por": item.registeredBy?.username,
                "Tipo de acción": translateActionRecords(item?.code),
                "Documento anexado": item?.document?.src ? "Si" : " ",
            },
        })
    );


    const tableTitleForOnePerson = ["Fecha", "Registrado por", "Tipo de acción", "Documento anexado"];
    const tableDataForOnePerson: DataTableInterface[] = [];
    personRecords.forEach((item) =>
        tableDataForOnePerson.push({
            rowId: item.id,
            payload: {
                "Fecha": formatCalendar(item.createdAt),
                "Registrado por": item.registeredBy.username,
                "Tipo de acción": translateActionRecords(item?.code),
                "Documento anexado": item?.document?.src ? <CheckIcon className="h-5 w-5 ml-20" color="green" /> : " ",
            },
        })
    );
    //----------------------------------------------------------------------------------------------------


    //Actions
    const actions: BtnActions[] = [
        {
            title: "Exportar a excel",
            action: () => setExportModal(true),
            icon: <BsFiletypeXlsx />,
        },
        {
            title: "Nuevo registro",
            action: () => setNewPersonRecord(true),
            icon: <PlusIcon className="h-5 w-5" />,
        },
    ];


    //-----------------------------------------------------------------------
    const exportAction = async (name: string) => {
        // exportStoreOrders(filter, name, () => setExportModal(false))
        const dataToExport: Record<string, string | number>[] = [];
        personRecords.forEach((item) => {
            dataToExport.push({
                'Fecha': formatDateForReportsWithYear(item.createdAt),
                'Registrado por': item.registeredBy.username,
                "Observaciones": item.observations
            });
        });
        exportExcel(dataToExport, name);
        setExportModal(false)
    };

    const rowAction = (id: number) => setShowAccessModal({ state: true, id });
    // const rowAction = (id: number) => setDeleteAccessModal({ state: true, id });

    return (
        <>
            {
                id === undefined ? (
                    <>
                        <GenericTable
                            rowAction={rowAction}
                            tableData={tableData}
                            tableTitles={tableTitle}
                            loading={isLoading}
                            //searching={searching}
                            actions={actions}
                            // filterComponent={{ availableFilters, filterAction }}
                            paginateComponent={
                                <Paginate
                                    action={(page: number) => setFilter({ ...filter, page })}
                                    data={paginate}
                                />
                            }
                        />
                    </>
                ) : (
                    <GenericTable
                        rowAction={rowAction}
                        tableData={tableDataForOnePerson}
                        tableTitles={tableTitleForOnePerson}
                        loading={isLoading}
                        //searching={searching}
                        actions={actions}
                        // filterComponent={{ availableFilters, filterAction }}
                        paginateComponent={
                            <Paginate
                                action={(page: number) => setFilter({ ...filter, page })}
                                data={paginate}
                            />
                        }
                    />
                )
            }

            {exportModal && (
                <Modal state={exportModal} close={setExportModal}>
                    <ExcelFileExport
                        exportAction={exportAction}
                        loading={isLoading}
                    />
                </Modal>
            )}

            {newPersonRecord && (
                <Modal state={newPersonRecord} close={setNewPersonRecord}>
                    <NewPersonRecordModal close={() => {
                        setNewPersonRecord(false)
                        setFilter({ page: 1 })
                    }} personId={id!} />
                </Modal>
            )}


            {deleteAccessModal.state && (
                <ModalAlert
                    type={""}
                    title="Eliminar registro"
                    text="Está a punto de eliminar este registro. Esta acción es definitiva y no puede ser revertida. ¿Está seguro de querer eliminar el registro?"
                    onClose={() => setDeleteAccessModal({ state: false, id: null })}
                    onAccept={() => {
                        deleteAccessRecords(id!)
                        setDeleteAccessModal({ state: false, id: null })
                    }}
                    isLoading={isLoading}
                />
            )}

            {showAccessModal.state && (
                <Modal state={showAccessModal.state} close={() => setShowAccessModal({ state: false, id: null })}>

                    <p className="py-3.5 max-w-xs break-words text-sm text-start font-semibold text-gray-900 first-letter:uppercase">Observaciones</p>
                    <textarea disabled cols={30} rows={Infinity} className="focus:ring-slate-400 mb-5 border-slate-400 focus:border-slate-600 text-slate-400 block w-full rounded-md  pr-10 sm:text-sm placeholder:text-slate-400 scrollbar-thin">
                        {personRecords?.find(item => item.id === showAccessModal.id)?.observations ?? ""}
                    </textarea>

                    {
                        personRecords?.find(item => item.id === showAccessModal.id)?.document?.src && (
                            <Button
                                name="Descargar documento"
                                color="slate-600"
                                type="button"
                                action={() => {
                                    saveAs(personRecords?.find(item => item.id === showAccessModal.id)?.document?.src!, "Registro.pdf",);
                                }}
                            />
                        )
                    }

                </Modal>
            )}

        </>
    )
}

export default ListOfRecords
