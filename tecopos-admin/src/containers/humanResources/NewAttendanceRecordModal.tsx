
import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import Button from "../../components/misc/Button";
import Select from "../../components/forms/Select";
import AsyncComboBox from "../../components/forms/AsyncCombobox";
import useServerUsers from "../../api/useServerUsers";
import DateInput from "../../components/forms/DateInput";
import { useLocation } from "react-router-dom"

const NewAttendanceRecordModal = ({ close, personId }: { close: Function, personId: number }) => {

    const { registerManualAccess, isLoading } = useServerUsers()

    const { pathname } = useLocation()

    const { control, handleSubmit } = useForm();

    const onSubmit: SubmitHandler<BasicType> = (data) => {

        if (pathname === "/human_resources/access") {
            // @ts-ignore
            registerManualAccess(data, close)
        } else {
            // @ts-ignore
            registerManualAccess({
                ...data,
                personId
            }, close)
        }

    };

    const selectRecordType: SelectInterface[] = [
        {
            id: "ENTRY",
            name: "Entrada"
        },
        {
            id: "EXIT",
            name: "Salida"
        }
    ]

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-100 pr-5 pl-2">

                {
                    pathname === "/human_resources/access" && (
                        <div className="py-2 w-full">
                            <AsyncComboBox
                                name="personId"
                                label="Persona"
                                control={control}
                                dataQuery={{
                                    url: "/administration/humanresource/person"
                                }}
                                normalizeData={{ id: "id", name: "firstName" }}
                                rules={{ required: "Este campo es requerido" }}
                            />
                        </div>
                    )
                }

                <div className="py-2 w-full">
                    <AsyncComboBox
                        name="areaId"
                        label="Punto de acceso"
                        control={control}
                        dataQuery={{
                            url: "/administration/area",
                            defaultParams: { type: "ACCESSPOINT" }
                        }}
                        normalizeData={{ id: "id", name: "name" }}
                        rules={{ required: "Este campo es requerido" }}
                    />
                </div>

                <div className="py-2 w-full">
                    <DateInput
                        label="Registrado en"
                        control={control}
                        defaultValue={null}
                        name="registeredAt"
                        includeTime={true}
                        rules={{ required: "Este campo es requerido" }}
                    />
                </div>

                <div className="py-2 w-full">
                    <Select
                        label="Tipo de registro"
                        data={selectRecordType}
                        name="recordType"
                        control={control}
                        rules={{ required: "Este campo es requerido" }}
                    />
                </div>


            </div>
            <div className="flex justify-end mt-5">
                <Button
                    name="Insertar"
                    color="slate-600"
                    type="submit"
                    loading={isLoading}
                    disabled={isLoading}
                />
            </div>
        </form>
    )
}

export default NewAttendanceRecordModal
