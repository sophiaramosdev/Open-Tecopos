import { useForm, SubmitHandler } from "react-hook-form";

import { useAppSelector } from "../../../store/hooks";

import Button from "../../../components/misc/Button";

import { convertBoolean } from "../../../utils/translate";
import ComboBox from "../../../components/forms/Combobox";

import Toggle from "../../../components/forms/Toggle";
import { getTimeArray } from "../../../utils/helpers";
import useServer from "../../../api/useServerMain";
import { ConfigUpdate, SendConfigUpdate } from "../../../interfaces/Interfaces";
import Input from "../../../components/forms/Input";
import MultiSelect from "../../../components/forms/Multiselect";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { useState } from "react";

const AccessLogging = () => {
    const { isLoading, isFetching, EditBussinesAdjustment } = useServer();

    const { business } = useAppSelector((state) => state.init);
    const { roles } = useAppSelector((state) => state.nomenclator);

    const { control, handleSubmit, watch } = useForm({ mode: "onChange" });

    const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (
        data
    ) => {

        let configsSend: SendConfigUpdate = {
            configs: []
        }

        const config: ConfigUpdate[] = [];


        config.push({
            key: 'force_access_system',
            value: data.force_access_system.toString()
        });

        config.push({
            key: 'enforce_business_open_close',
            value: data.enforce_business_open_close.toString()
        });

        if (data.enforce_business_open_close.toString() === "true") {
            config.push({
                key: 'business_startsat_working_hours',
                value: data.business_startsat_working_hours.toString()
            });

            config.push({
                key: 'business_endsat_working_hours',
                value: data.business_endsat_working_hours.toString()
            });
        }

        config.push({
            key: 'maximum_day_working_hours',
            value: data.maximum_day_working_hours.toString()
        });

        config.push({
            key: 'disable_reentry_in_business',
            value: data.disable_reentry_in_business.toString()
        });

        if (data.disable_reentry_in_business.toString() === "false") {
            config.push({
                key: 'allowed_roles_to_allow_reentry',
                //@ts-ignore
                value: data.allowed_roles_to_allow_reentry.join(',')
            });
        }
      
        configsSend = {
            configs: config
        }

        EditBussinesAdjustment(configsSend);

    };




    //-- force_access_system
    const force_access_system = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'force_access_system')?.value ?? '');

    // business_startsat_working_hours 
    const business_startsat_working_hours = business?.configurationsKey?.find((item) => item.key === 'business_startsat_working_hours')?.value ?? ''

    // business_endsat_working_hours 
    const business_endsat_working_hours = business?.configurationsKey?.find((item) => item.key === 'business_endsat_working_hours')?.value ?? ''

    // enforce_business_open_close 
    const enforce_business_open_close = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'enforce_business_open_close')?.value ?? '')

    const enforce_business_open_close_default = watch!("enforce_business_open_close") === undefined ? convertBoolean(business?.configurationsKey?.find((item) => item.key === 'enforce_business_open_close')?.value ?? '') : watch!("enforce_business_open_close")

    // maximum_day_working_hours  
    const maximum_day_working_hours = business?.configurationsKey?.find((item) => item.key === 'maximum_day_working_hours')?.value ?? ''

    // disable_reentry_in_business  
    const disable_reentry_in_business = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'disable_reentry_in_business')?.value ?? '')
    const disable_reentry_in_business_default = watch!("disable_reentry_in_business") === undefined ? convertBoolean(business?.configurationsKey?.find((item) => item.key === 'disable_reentry_in_business')?.value ?? '') : watch!("disable_reentry_in_business")

    // allowed_roles_to_allow_reentry   
    const allowed_roles_to_allow_reentry = business?.configurationsKey?.find((item) => item.key === 'allowed_roles_to_allow_reentry')?.value ?? ''

    const dataRoles: SelectInterface[] = roles.map((item) => ({
        id: item.code,
        name: item.name,
    }));


    const rolesArray: string[] = allowed_roles_to_allow_reentry.split(',');

    const rolesObjects = rolesArray.map(role => (role));

    //---------------------------------------------------------------------------------------
    return (
        <>
            <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
                <form onSubmit={handleSubmit(onSubmit)}>

                    <div className="py-3">
                        <Toggle
                            name="force_access_system"
                            control={control}
                            defaultValue={force_access_system}
                            title="Forzar acceso al sistema por registro de asistencia"
                        />
                    </div>

                    <div className="py-3">
                        <Toggle
                            name="enforce_business_open_close"
                            control={control}
                            defaultValue={enforce_business_open_close}
                            title="Forzar inicio y fin de horario laboral"
                        />
                    </div>

                    {enforce_business_open_close_default && (
                        <>
                            <div className="py-3">
                                <ComboBox
                                    name="business_startsat_working_hours"
                                    data={getTimeArray()}
                                    label="Inicio de horario laboral"
                                    control={control}
                                    rules={{ required: "Este campo es requerido" }}
                                    defaultValue={business_startsat_working_hours}
                                />
                            </div>

                            <div className="py-3">
                                <ComboBox
                                    name="business_endsat_working_hours"
                                    data={getTimeArray()}
                                    label="Fin de horario laboral"
                                    control={control}
                                    rules={{ required: "Este campo es requerido" }}
                                    defaultValue={business_endsat_working_hours}
                                />
                            </div>
                        </>
                    )}

                    <div className="py-3">
                        <div className="w-1/3">
                            <Input
                                name="maximum_day_working_hours"
                                control={control}
                                defaultValue={maximum_day_working_hours}
                                label="Cantidad máxima de horas de trabajo"
                                textAsNumber
                            />
                        </div>
                    </div>



                    <div className="py-3">
                        <Toggle
                            name="disable_reentry_in_business"
                            control={control}
                            defaultValue={disable_reentry_in_business}
                            title="Deshabilitar posibilidad de reentrada en el día al negocio"
                        />
                    </div>

                    {
                        !disable_reentry_in_business_default &&
                        (
                            <div className="py-3 w-1/3">
                                <MultiSelect
                                    name="allowed_roles_to_allow_reentry"
                                    control={control}
                                    byDefault={rolesObjects}
                                    label="Roles permitidos para dar reentrada"
                                    data={dataRoles}
                                />
                            </div>
                        )
                    }

                    <div className="pt-6">
                        <div className="max-w-full flow-root  pt-5 pb-4  bg-slate-50 sm:px-6">
                            <div className="float-right">
                                <Button
                                    color="slate-600"
                                    type="submit"
                                    name="Actualizar"
                                    loading={isFetching}
                                    disabled={isLoading || isFetching}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </div>

        </>
    );
}

export default AccessLogging
