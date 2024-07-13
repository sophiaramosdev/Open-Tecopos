import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid';

interface StatusDataInterface {
	name: string;
	stat?: string|number;
}

interface ComponentPropsInterface {
	label?: string;
	data: StatusDataInterface[];
}

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(' ');
}

export default function StatusComponent({
	label,
	data,
}: ComponentPropsInterface) {
	return (
		<div>
			{label && (
				<h3 className='text-base font-semibold leading-6 text-gray-900'>
					Last 30 days
				</h3>
			)}
			<dl className='mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:flex md:flex-wrap md:divide-x md:divide-y-0'>
				{data.map((item) => (
					<div key={item.name} className='flex-grow px-4 py-5 sm:p-6'>
						<dt className='text-base font-bold text-gray-500 text-center'>{item.name}</dt>
						<dd className='mt-1 flex items-baseline justify-center lg:flex'>
							<div className='flex items-baseline text-2xl font-semibold text-indigo-800'>
								{item.stat??0}
							</div>
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
