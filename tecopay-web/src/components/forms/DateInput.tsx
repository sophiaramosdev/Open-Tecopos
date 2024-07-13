import React, { useEffect, useState } from 'react';
import es from 'date-fns/locale/es';
import subDays from 'date-fns/subDays';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useController, UseControllerProps } from 'react-hook-form';
import moment from 'moment';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface DateInput {
	label: string;
	untilToday?: boolean;
	fromToday?: boolean;
	fromCustom?: string;
	includeTime?: boolean;
	minutesInterval?: number;
	disabled?: boolean;
}

const DateInput = (props: UseControllerProps & DateInput) => {
	const { field, fieldState } = useController(props);
	const {
		label,
		fromToday,
		fromCustom,
		untilToday,
		includeTime,
		defaultValue,
		disabled,
		minutesInterval,
	} = props;

	const initialValue = field.value
		? moment(field.value).toDate()
		: defaultValue;

	const [currentDate, setcurrentDate] = useState<Date | null>(initialValue);
	useEffect(() => {
		setcurrentDate(initialValue);
	}, [field.value]);

	return (
		<div className='w-full'>
			<label
				htmlFor='label'
				className='block text-sm font-medium text-gray-700'
			>
				{label}
			</label>
			<div className='relative rounded-md shadow-sm'>
				<div className='relative w-full'>
					<DatePicker
						onChange={(e) => {
							setcurrentDate(e);
							field.onChange(
								moment(e).format(`YYYY-MM-DD${includeTime ? ' HH:mm' : ''}`),
							);
						}}
						className={`${
							fieldState.error
								? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
								: 'focus:ring-gray-500 border-gray-500 focus:border-gray-600 text-gray-500'
						} ${!!disabled ? 'bg-slate-100' : ''} w-full rounded-md sm:text-sm placeholder:text-slate-400 cursor-pointer`}
						selected={currentDate}
						placeholderText='DD-MM-YYYY'
						locale={es}
						timeIntervals={minutesInterval ?? 30}
						timeCaption='Hora'
						timeFormat='hh:mm a'
						dateFormat={`dd MMMM yyyy ${includeTime ? '- hh:mm a' : ''}`}
						minDate={
							fromCustom
								? subDays(moment(fromCustom).toDate(), 0)
								: fromToday
									? subDays(new Date(), 0)
									: undefined
						}
						maxDate={untilToday ? subDays(new Date(), 0) : undefined}
						popperPlacement='bottom'
						showTimeSelect={!!includeTime}
						disabled={!!disabled}
					/>
					<div className='absolute p-2 gap-1 right-0 top-0 flex items-center rounded-r-md px-2 focus:outline-none'>
						{fieldState.error && (
							<>
								<ExclamationCircleIcon
									className='h-5 w-5 text-red-500'
									aria-hidden='true'
								/>
							</>
						)}
					</div>

					{fieldState.error && (
						<span className='text-xs text-red-600'>
							{fieldState.error.message}
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

export default DateInput;