import { useContext, useState, useEffect, Fragment } from 'react';
import Button from '../../../components/misc/Button';
import { NewEntityContext } from './NewEntityModal';
import { CirclePicker } from 'react-color';
import ImageComponent from '../../../components/Images/Image';
import { TrashIcon } from '@heroicons/react/24/outline';
import { EntityCategoryInterface } from '../../../interfaces/serverInterfaces';

const CardTypes = () => {
	const { setCurrentStep, setValue, fields, remove, isFetching } =
		useContext(NewEntityContext);

	return (
		<>
			<div className='h-auto border border-slate-300 rounded p-2'>
				<div className=''>
					<Button
						color='slate-400'
						name='Añadir nuevo tipo'
						action={() => setValue!('newCardType', true)}
						full
						outline
						textColor='slate-600'
					/>
				</div>
				<div className='grid grid-cols-2 gap-5 max-h-96 h-96 overflow-y-auto p-5 items-start'>
					{fields.map((item: EntityCategoryInterface, idx: number) => (
						<div
							key={idx}
							className='relative group flex flex-col justify-center w-full hover:cursor-pointer'
						>
							<h3 className='font-semibold text-center'>{item.name}</h3>
							<div className='hidden group-hover:block absolute bg-white rounded-md top-7 right-2 z-10'>
								<Button
									color='red-600'
									textColor='red-600'
									outline
									icon={<TrashIcon className='h-5' />}
									action={() => remove!(idx)}
								/>
							</div>
							<div
								onClick={() => {
									setValue!('currentType', idx);
									setValue!('newCardType', true);
								}}
							>
								<ImageComponent
									className='w-full h-44 border border-gray-400 rounded-md'
									url={item?.cardImage?.url}
									hash={item?.cardImage?.hash}
								/>
							</div>
						</div>
					))}
				</div>
			</div>
			<div className='grid grid-cols-2 gap-3 py-2 mt-2 mx-2'>
				<Button
					color='indigo-700'
					name='Atrás'
					action={() => setCurrentStep!(0)}
					full
					outline
					textColor='indigo-700'
				/>
				<Button
					color='indigo-700'
					name='Crear entidad'
					type='submit'
					full
					loading={isFetching}
					disabled={isFetching}
				/>
			</div>
		</>
	);
};

export default CardTypes;

interface ChangeColor {
	changeValue: Function;
	close: Function;
}

const ChangeColor = ({ changeValue, close }: ChangeColor) => {
	return (
		<div className='flex flex-col justify-center gap-y-5'>
			<div className='flex justify-center w-full'>
				<CirclePicker
					circleSize={40}
					circleSpacing={18}
					width='300px'
					onChange={(value: any) => {
						console.log(changeValue);
						changeValue(value.hex);
						close();
					}}
				/>
			</div>
		</div>
	);
};
