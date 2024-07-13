import { useContext, useState } from 'react';
import Button from '../../../components/misc/Button';
import { EditEntityContext } from './EditEntityModal';
import ImageComponent from '../../../components/Images/Image';
import { TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../../../components/modals/GenericModal';
import AlertContainer from '../../../components/misc/AlertContainer';

const EditCardTypes = () => {
	const { entity, setCurrentType, deleteCategory, isFetching } =
		useContext(EditEntityContext);
	const [delAction, setDelAction] = useState<number | null>(null);

	return (
		<div className='h-auto border border-slate-300 rounded p-2'>
			<div className=''>
				<Button
					color='slate-400'
					name='Añadir nuevo tipo'
					action={() => setCurrentType!(-1)}
					full
					outline
					textColor='slate-600'
				/>
			</div>
			<div className='grid grid-cols-2 gap-5 max-h-96 h-96 overflow-y-auto p-5 items-start'>
				{entity?.categories.map((item, idx) => (
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
								action={() => setDelAction(item.id)}
							/>
						</div>
						<div onClick={() => setCurrentType!(idx)}>
							<ImageComponent
								className='w-full h-44 border border-gray-400 rounded-md'
								url={item?.cardImage?.url}
								hash={item?.cardImage?.hash}
							/>
						</div>
					</div>
				))}

				{delAction && (
					<Modal state={!!delAction} close={() => setDelAction(null)}>
						<AlertContainer
							onAction={() => deleteCategory!(delAction)}
							onCancel={() => setDelAction(null)}
							text='Seguro que desea eliminar este tipo de tarjeta?'
							title={`Eliminar ${entity?.categories.find((elem) => elem.id === delAction)!.name}`}
							loading={isFetching}
						/>
					</Modal>
				)}
			</div>
		</div>
	);
};

export default EditCardTypes;
