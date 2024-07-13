import { SubmitHandler, useForm } from "react-hook-form";
import useServerBusiness from "../../../api/useServerBusiness";
import { ConfigurationInterface, SendConfigUpdate } from "../../../interfaces/ServerInterfaces";
import { useParams } from "react-router-dom";
import Toggle from "../../../components/forms/Toggle";
import ButtonActualizado from "../../../components/misc/ButtonActualizado";
import Input from "../../../components/forms/Input";

// @ts-ignore
const MobileApps = ({ configurationsKey }) => {
    const { isLoading, isFetching, updateConfigBusiness } = useServerBusiness();
    const { businessId } = useParams();
    const { handleSubmit, control } = useForm<Partial<ConfigurationInterface>>({
        mode: "onChange",
    });

    const list_convert_to_boolean = configurationsKey.map((item: any) => {
        return {
            key: item.key,
            value: item.value === "true",
        };
    });
    const is_app_in_manteinance = list_convert_to_boolean.find(
        (p: any) => p.key === "is_app_in_manteinance"
    )?.value;

    const android_min_version = configurationsKey.find(
        (p: any) => p.key === "android_min_version"
    )
    const android_url_store = configurationsKey.find(
        (p: any) => p.key === "android_url_store"
    )
    const ios_min_version = configurationsKey.find(
        (p: any) => p.key === "ios_min_version"
    )
    const ios_url_store = configurationsKey.find(
        (p: any) => p.key === "ios_url_store"
    )

    const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (data) => {

        const configsSend: SendConfigUpdate = {
            configs: [
                {
                    key: "is_app_in_manteinance",
                    value: data.is_app_in_manteinance.toString(),
                },
                {
                    key: "android_min_version",
                    value: data.android_min_version
                },
                {
                    key: "android_url_store",
                    value: data.android_url_store
                },
                {
                    key: "ios_min_version",
                    value: data.ios_min_version
                },
                {
                    key: "ios_url_store",
                    value: data.ios_url_store
                },
            ],
        };

        updateConfigBusiness!(businessId, configsSend);
    };

    return (
        <div className='min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white'>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className='py-1'>
                    <Input
                        name='android_min_version'
                        control={control}
                        label={'Version minima de android'}
                        rules={{ required: 'Este campo es requerido' }}
                        defaultValue={android_min_version.value}
                    />
                </div>
                <div className='py-1'>
                    <Input
                        name='android_url_store'
                        control={control}
                        label={'URL Google Play'}
                        rules={{ required: 'Este campo es requerido' }}
                        defaultValue={android_url_store.value}
                    />
                </div>
                <div className='py-1'>
                    <Input
                        name='ios_min_version'
                        control={control}
                        label={'Version minima de iOS'}
                        rules={{ required: 'Este campo es requerido' }}
                        defaultValue={ios_min_version.value}
                    />
                </div>
                <div className='py-1'>
                    <Input
                        name='ios_url_store'
                        control={control}
                        label={'URL Apple Store'}
                        rules={{ required: 'Este campo es requerido' }}
                        defaultValue={ios_url_store.value}
                    />
                </div>
                <div className='py-1'>
                    <Toggle
                        name='is_app_in_manteinance'
                        control={control}
                        defaultValue={is_app_in_manteinance}
                        title='App en mantenimiento'
                    />
                </div>

                <div className='pt-6'>
                    <div className='max-w-full flow-root  pt-5 pb-4  bg-slate-50 sm:px-6'>
                        <div className='float-right'>
                            <ButtonActualizado
                                color='slate-600'
                                type='submit'
                                name='Actualizar'
                                loading={isFetching}
                                disabled={isLoading || isFetching}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default MobileApps
