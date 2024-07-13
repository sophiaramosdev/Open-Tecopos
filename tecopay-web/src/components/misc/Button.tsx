import React from 'react';
import LoadingSpin from './LoadingSpin';

interface ButtonProp {
	name?: string;
	icon?: React.ReactNode;
	color: string;
	outline?: boolean;
	action?: Function;
	type?: 'button' | 'reset' | 'submit';
	disabled?: boolean;
	iconAfter?: React.ReactNode;
	loading?: boolean;
	full?: boolean;
	textColor?: string;
	colorHover?: string;
	value?: number | string;
	textColorHover?: string;
}

const Button = ({
	name,
	color,
	icon,
	action,
	iconAfter,
	loading,
	disabled,
	full,
	outline,
	colorHover,
	value,
	textColor = 'white',
	textColorHover,
	type = 'button',
}: ButtonProp) => {
	return (
		<button
			type={type}
			className={`inline-flex items-center rounded-md border justify-center transition-all ease-in-out duration-200
      ${
				outline ? `border ${"border-"+color}` : `border-transparent bg-${color}`
			} ${
				full ? 'w-full' : ''
			} ${!!name ? "px-3 py-2" : "px-1.5 py-1.5"} text-sm font-medium text-${textColor} shadow-sm focus:outline-none gap-2 ${
				disabled && 'cursor-not-allowed'
			} hover:shadow-md ${
				colorHover
					? 'hover:bg-' + colorHover + ` hover:text-${textColorHover}`
					: ''
			}`}
			onClick={(e) => action && action(e.currentTarget.value)}
			disabled={disabled||loading}
			value={value && value}
		>
			{loading ? <LoadingSpin color={textColor} /> : icon && icon}
			{name && name}
			{iconAfter && iconAfter}
		</button>
	);
};

export default Button;
