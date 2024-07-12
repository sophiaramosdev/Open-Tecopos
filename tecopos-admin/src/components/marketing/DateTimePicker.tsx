import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useController, UseControllerProps } from "react-hook-form";
import { formatDateTime } from '../../utils/functions';

interface InputProps {
    label?: string;
    placeholder?: string;
    type?: "number" | "text" | "password" | "date";
    disabled?: boolean;
    stackedText?: string;
    textAsNumber?: boolean;
    numberAsCurrency?: { precision: number };
}

const showAsCurrency = (amount: number, precision: number) =>
    new Intl.NumberFormat("en-EN", {
        style: "currency",
        currency: "USD",
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: precision,
    }).format(amount);

const DateTimePicker = (props: UseControllerProps & InputProps) => {

    const {
        label,
        defaultValue,
        type = "text",
        disabled,
        numberAsCurrency,
    } = props;
    const { field, fieldState } = useController(props);

    const initialValue =
        type === "number" && numberAsCurrency
            ? showAsCurrency(field.value ?? defaultValue ?? 0, numberAsCurrency.precision)
            : field.value ?? defaultValue;

    const [selectedDate, setSelectedDate] = useState();
    const [input, setInput] = useState<string>(initialValue ?? "");

    const handleDateChange = (date: any) => {
        field.onChange(date.toString())
        setSelectedDate(date);
        setInput(date)
    }

    const today = new Date();

    return (
        <div className="relative">
            {label && (
                <label
                    htmlFor={label}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label}
                </label>
            )}
            <DatePicker
                minDate={today}
                disabled={disabled}
                selected={selectedDate}
                onChange={(e) => {
                    handleDateChange(e)
                    field.onChange(e?.toString());
                }}
                // dateFormat="Pp"
                className="mt-1 focus:ring-gray-400 border-gray-400 focus:border-gray-600 text-gray-500 block w-full rounded-md sm:text-sm placeholder:text-slate-400 "
                placeholderText='Seleccione la fecha'
                value={field ? formatDateTime(field.value) : formatDateTime(defaultValue)}
            />

            {
                fieldState.error && (
                    <>
                        <div className="pointer-events-none absolute inset-y-0 right-0 top-2 pr-3">
                            <ExclamationCircleIcon
                                className="h-5 w-5 text-red-500"
                                aria-hidden="true"
                            />
                        </div>

                        <p className="absolute -bottom-5 text-xs text-red-600 flex flex-shrink-0">
                            {fieldState.error?.message}
                        </p>
                    </>
                )
            }
        </div >
    );
}

export default DateTimePicker
