import Input from '../../components/forms/Input';
import SingleRadio from '../../components/forms/SingleRadio';
import Select from '../../components/forms/Select';
import MultiSelect from '../../components/forms/Multiselect';
import Button from '../../components/misc/Button';
import { useAppSelector } from '../../store/hooks';
import { SubmitHandler, useForm } from 'react-hook-form';
import { SelectInterface } from '../../interfaces/InterfacesLocal';
import { toast } from "react-toastify";
import InlineRadio from '../../components/forms/InlineRadio';

interface FormModalInterface {
    modifyProductPricesAction: Function;
    formAction: Function;
    isFetching: boolean;
}
const PriceChangeModal = ({
    modifyProductPricesAction,
    formAction,
    isFetching,
}: FormModalInterface) => {

    const { business } = useAppSelector((state) => state.init);
    const { control, handleSubmit, watch } = useForm();


    const currencies: SelectInterface[] = business!.availableCurrencies.map(
        (item) => ({
            id: item.code,
            name: item.code,
        })
    );

    const priceSystem: SelectInterface[] = business!.priceSystems.map(
        (item) => ({
            id: item.id,
            name: item.name,
        })
    );


    const onSubmit: SubmitHandler<Record<string, number>> = (formData) => {

        if (watchTypeChange === "percent") {
            const {
                typeChange,
                mode,
                codeCurrency,
                priceSystemId,
                percent,
                adjustType,
                adjustRound,
            } = formData

            formAction({
                typeChange,
                mode,
                codeCurrency,
                priceSystemId,
                percent,
                adjustType,
                adjustRound,
                propagateToAllChilds: true
            })
        } else {
            const {
                adjustRound,
                adjustType,
                baseCodeCurrency,
                codeCurrency,
                exchangeRate,
                priceSystemId,
                basePriceSystemId
            } = formData

            if (codeCurrency === baseCodeCurrency) {
                toast.error("Las monedas deben ser diferentes.")
                
            } else if(priceSystemId === basePriceSystemId){
                toast.error("Los sistemas de precio deben ser diferentes.")

            }else {
                let dataToSend = {}

                if (adjustType === undefined) {
                    toast.error("Seleccione un tipo de ajuste.")
                } else {

                    //@ts-ignore
                    if (adjustType === "decimal") {
                        dataToSend = {
                            adjustType,
                            baseCodeCurrency,
                            codeCurrency,
                            exchangeRate,
                            priceSystemId,
                            basePriceSystemId
                        }
                    } else {
                        dataToSend = {
                            //@ts-ignore
                            adjustRound: adjustRound.join(","),
                            adjustType,
                            baseCodeCurrency,
                            codeCurrency,
                            exchangeRate,
                            priceSystemId,
                            basePriceSystemId
                        }
                    }
                    modifyProductPricesAction(dataToSend);
                }
            }
        }


    };


    const RadioValues = [
        {
            label: "Porciento",
            value: "percent",
        },
        {
            label: "Base referencial",
            value: "referencialBase",
        },
    ];

    const watchTypeChange = watch("typeChange") ?? "percent";

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className='w-full'>

                <div className="flex flex-col gap-y-2 ml-10 ">
                    <h2 className='text-xl font-semibold mb-2'>Cambiar precios</h2>


                    <div>
                        <InlineRadio
                            name="typeChange"
                            data={RadioValues}
                            control={control}
                            rules={{ required: "Este campo es requerido" }}
                            defaultValue={"percent"}
                        />
                    </div>

                    {
                        watchTypeChange === "referencialBase" && (
                            <div className="flex flex-col gap-y-2 ml-10">

                                <div className="flex items-center">
                                    <p>De todos los productos en:</p>

                                    <div className="ml-2">
                                        <Select
                                            data={currencies}
                                            label=""
                                            name="codeCurrency"
                                            control={control}
                                            rules={{ required: "Este campo es requerido" }}
                                        />
                                    </div>

                                </div>
                                <div className="flex items-center">
                                    <p>del sistema de precio:</p>

                                    <div className="ml-2">
                                        <Select
                                            data={priceSystem}
                                            label=""
                                            name="priceSystemId"
                                            control={control}
                                            rules={{ required: "Este campo es requerido" }}
                                        />
                                    </div>

                                </div>
                                <div className="flex items-center">
                                    <p className='whitespace-nowrap'>tomando como base el sistema de precio:</p>

                                </div>
                                <div className="flex items-center">
                                    <div className="mx-2 w-auto">
                                        <Select
                                            data={priceSystem}
                                            label=""
                                            name="basePriceSystemId"
                                            control={control}
                                            rules={{ required: "Este campo es requerido" }}
                                        />
                                    </div>
                                    <p> en</p>
                                    <div className="mx-2 w-auto">
                                        <Select
                                            data={currencies}
                                            label=""
                                            name="baseCodeCurrency"
                                            control={control}
                                            rules={{ required: "Este campo es requerido" }}
                                        />

                                    </div>

                                </div>

                                <div className="flex items-center">
                                    <p className='whitespace-nowrap'> a la tasa de cambio:</p>
                                    <div className='w-auto mx-2'>
                                        <Input
                                            label=""
                                            name="exchangeRate"
                                            control={control}
                                            textAsNumber
                                            placeholder="0.00"
                                            rules={{ required: "Este campo es requerido" }}
                                        />
                                    </div>
                                </div>

                                <SingleRadio
                                    name="adjustType"
                                    value={"decimal"}
                                    control={control}
                                    label="Ajuste decimal"
                                />
                                <div className="flex flex-col">
                                    <SingleRadio
                                        name="adjustType"
                                        value={"integer"}
                                        control={control}
                                        label="Ajustar al entero más próximo terminado en:"
                                    />
                                    {
                                        (watch("adjustType") === "integer") && (
                                            <MultiSelect
                                                name="adjustRound"
                                                rules={(watch("adjustType") === "integer") ? { required: "Este campo es requerido" } : {}}
                                                data={["0", "5", "00", "50", "000"].map((item) => ({
                                                    id: item,
                                                    name: (item),
                                                }))}
                                                label=""
                                                control={control}
                                                disabled={!(watch("adjustType") === "integer")}
                                            />

                                        )}

                                </div>
                            </div>
                        )
                    }

                    {
                        watchTypeChange === "percent" && (
                            <div className="flex flex-col gap-y-2 ml-10">
                                <SingleRadio
                                    name="mode"
                                    value={"increment"}
                                    control={control}
                                    label="Aumentar"
                                />
                                <SingleRadio
                                    name="mode"
                                    value={"decrement"}
                                    control={control}
                                    label="Disminuir"
                                />

                                <div className="flex items-center">
                                    <p>Todos los precios en:</p>

                                    <div className="ml-5">
                                        <Select
                                            data={currencies}
                                            label=""
                                            name="codeCurrency"
                                            // defaultValue={general_cost_currency}
                                            control={control}
                                            rules={{ required: "Este campo es requerido" }}
                                        />
                                    </div>

                                </div>
                                <div className="flex items-center">
                                    <p className='whitespace-nowrap'>del sistema de precio:</p>
                                    <div className="mx-2 w-auto">
                                        <Select
                                            data={priceSystem}
                                            label=""
                                            name="priceSystemId"
                                            control={control}
                                            rules={{ required: "Este campo es requerido" }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <p>En un:</p>

                                    <div className="ml-5 w-20">
                                        <Input
                                            label=""
                                            name="percent"
                                            control={control}
                                            type='number'
                                            placeholder="0.00"
                                            rules={{ required: "Este campo es requerido" }}
                                        />
                                    </div>
                                    <p className="ml-1 text-xl font-thin"> %</p>
                                </div>

                                <SingleRadio
                                    name="adjustType"
                                    value={"decimal"}
                                    control={control}
                                    label="Ajuste decimal"
                                />
                                <div className="flex flex-col">
                                    <SingleRadio
                                        name="adjustType"
                                        value={"integer"}
                                        control={control}
                                        label="Ajustar al entero más próximo terminado en:"
                                    />
                                    {
                                        (watch("adjustType") === "integer") && (
                                            <MultiSelect
                                                name="adjustRound"
                                                rules={{ required: "Este campo es requerido" }}
                                                data={["0", "5", "00", "50", "000"].map((item) => ({
                                                    id: item,
                                                    name: (item),
                                                }))}
                                                label=""
                                                control={control}
                                                disabled={!(watch("adjustType") === "integer")}
                                            />
                                        )
                                    }

                                </div>

                            </div>
                        )
                    }

                </div>
                <div className="flex justify-end mt-10">
                    <Button
                        type="submit"
                        color="slate-600"
                        name="Actualizar"
                        loading={isFetching}
                        disabled={isFetching}
                    />
                </div>
            </form>
        </>
    );
}

export default PriceChangeModal
