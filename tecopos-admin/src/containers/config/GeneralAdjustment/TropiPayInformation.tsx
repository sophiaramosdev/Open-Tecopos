import { useForm, SubmitHandler } from "react-hook-form";
import useServer from "../../../api/useServerMain"
import { ConfigUpdate, SendConfigUpdate } from "../../../interfaces/Interfaces";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { useAppSelector } from "../../../store/hooks";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";



const TropiPayInformation = () => {

    const { isFetching, EditMySensibleConfigurations } = useServer()

    const { control, handleSubmit } = useForm();

    const { business } = useAppSelector((state) => state.init);

    const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (
        data
    ) => {

        let configsSend: SendConfigUpdate = {
            configs: []
        }

        const config: ConfigUpdate[] = [];

        config.push({
            key: 'tropipay_client_id',
            value: data.tropipay_client_id.toString()
        });

        config.push({
            key: 'tropipay_client_secret',
            value: data.tropipay_client_secret.toString()
        });

        configsSend = {
            configs: config
        }

        EditMySensibleConfigurations(configsSend);

    };

    const [viewPasw1, setViewPasw1] = useState(false);
    const [viewPasw2, setViewPasw2] = useState(false);

    const tropipay_client_id = business?.configurationsKey?.find((item) => item.key === 'tropipay_client_id')?.value
    const tropipay_client_secret = business?.configurationsKey?.find((item) => item.key === 'tropipay_client_secret')?.value


    return (
        <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">

            <form onSubmit={handleSubmit(onSubmit)}>

                <div className="py-3 relative w-1/2">

                    <Input
                        label="Client ID"
                        name="tropipay_client_id"
                        control={control}
                        placeholder="Inserte su client id, esta información no la comparta con nadie"
                        rules={{ required: "Campo requerido" }}
                        type={viewPasw1 ? "text" : "password"}
                        defaultValue={tropipay_client_id}
                    />
                    {viewPasw1 ? (
                        <EyeIcon
                            className="absolute top-10 right-2 h-5 text-gray-700 hover:cursor-pointer"
                            onClick={() => setViewPasw1(!viewPasw1)}
                        />
                    ) : (
                        <EyeSlashIcon
                            className="absolute top-10 right-2 h-5 text-gray-700 hover:cursor-pointer"
                            onClick={() => setViewPasw1(!viewPasw1)}
                        />
                    )}
                </div>

                <div className="py-3 relative w-1/2">

                    <Input
                        label="Client Secret"
                        name="tropipay_client_secret"
                        control={control}
                        placeholder="Inserte su client secret, esta información no la comparta con nadie"
                        rules={{ required: "Campo requerido" }}
                        type={viewPasw2 ? "text" : "password"}
                        defaultValue={tropipay_client_secret}
                    />
                    {viewPasw2 ? (
                        <EyeIcon
                            className="absolute top-10 right-2 h-5 text-gray-700 hover:cursor-pointer"
                            onClick={() => setViewPasw2(!viewPasw2)}
                        />
                    ) : (
                        <EyeSlashIcon
                            className="absolute top-10 right-2 h-5 text-gray-700 hover:cursor-pointer"
                            onClick={() => setViewPasw2(!viewPasw2)}
                        />
                    )}
                </div>


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
    )
}

export default TropiPayInformation
