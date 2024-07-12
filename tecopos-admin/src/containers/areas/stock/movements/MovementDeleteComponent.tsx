import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import TextArea from "../../../../components/forms/TextArea";
import MovementsTypeBadge from "../../../../components/misc/badges/MovementsTypeBadge";
import Button from "../../../../components/misc/Button";

interface MovementDelInterface {
    id?: number;
    name: string;
    movType?: string;
    deleteAction: Function;
    loading: boolean;
}

const MovementDeleteComponent = ({
    name,
    deleteAction,
    movType,
    loading,
}: MovementDelInterface) => {
    const { control, handleSubmit } =
        useForm<Record<string, string | number>>();
    const onSubmit: SubmitHandler<Record<string, string | number>> = data => {
        deleteAction(data);
    };

    return (
        <form className="flex-row" onSubmit={handleSubmit(onSubmit)}>
            <div>
                <h2 className="text-lg font-semibold text-gray-900">
                    Eliminar: <MovementsTypeBadge operation={movType} />
                </h2>
                <p className="text-md font-semibold text-gray-700">{name}</p>
            </div>
            <div>
                <TextArea
                    label="Nota de Eliminación (Requerido)"
                    name="description"
                    control={control}
                    rules={{ required: "Este campo es requerido" }}
                />
            </div>
            <div className="flex p-3 justify-end">
                <Button
                    name="Eliminar"
                    type="submit"
                    color="red-500"
                    loading={loading}
                    disabled={loading}
                />
            </div>
        </form>
    );
};

export default MovementDeleteComponent;
