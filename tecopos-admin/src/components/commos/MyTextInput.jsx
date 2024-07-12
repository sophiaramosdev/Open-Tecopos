import { useField } from "formik";
import React from "react";

export const MyTextInput = ({
    isValid,
    label,
    ...props
}) => {
    const [field] = useField(props);
    const textError = props.textError;
    const valid = isValid === undefined || isValid === null ? true : isValid;

    return (
        <div className="flex flex-col justify-start w-full">
            <div className={`${props.inputclass} relative`}>
                <label
                    htmlFor={props.id || props.name}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label}
                </label>
                <input
                    className={`${valid ? "border-gray-300 focus:ring-gray-500 focus:border-gray-500" : "border-red-500 focus:ring-red-500 focus:border-red-500"} mt-1 appearance-none block w-full shadow-sm sm:text-sm rounded-md`}
                    {...field}
                    {...props}
                />
            </div>
            {
                !isValid ? (
                    <p className="text-red-600 text-[12px]">
                        {textError}
                    </p>
                ) : (
                        ""
                    )}
        </div>
    );
};
export default MyTextInput;
