import { useContext, useState } from 'react';
import Input from '../../../components/forms/Input';
import Button from '../../../components/misc/Button';
import Toggle from '../../../components/forms/Toggle';
import AlertContainer from '../../../components/misc/AlertContainer';
import Modal from '../../../components/modals/GenericModal';
import { TrashIcon } from '@heroicons/react/24/outline';
import AsyncComboBox from '../../../components/forms/AsyncCombobox';
import GenericImageDrop from '../../../components/Images/GenericImageDrop';
import { EditEntityContext } from './EditEntityModal';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import Select from '../../../components/forms/Select';
import { useAppSelector } from '../../../store/hooks';
import { SliderPicker } from 'react-color';

const EditEntityGeneralInfo = () => {
	const { entity, updateEntity, deleteEntity, isFetching, close } =
		useContext(EditEntityContext);

	const { entityTypes } = useAppSelector((state) => state.init);

	const [delAction, setDelAction] = useState(false);
	const [changeColorValue, setChangeColorValue] = useState<{
		onChange: Function;
	} | null>(null);

	const {
		control,
		handleSubmit,
		formState: { isSubmitting },
	} = useForm();

	const onSubmit: SubmitHandler<Record<string, any>> = async (data) => {
		await updateEntity!(entity?.id, data);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<div className='border border-slate-300 rounded p-2 py-3'>
				<div className='h-full'>
					<div className='mt-2'>
						<GenericImageDrop
							className='h-40 w-40 rounded-full border border-gray-400 m-auto overflow-hidden'
							control={control}
							name='profileImageId'
							defaultValue={entity?.profileImage?.id}
							previewDefault={entity?.profileImage?.url}
							previewHash={entity?.profileImage?.hash}
						/>
					</div>
					<div className='grid grid-cols-2 gap-3 grid-flow-row auto-rows-max mx-2 mt-4'>
						<div className='mt-2'>
							<Input
								name='name'
								label='Nombre de la entidad'
								placeholder='Nombre de la Entidad'
								control={control}
								rules={{
									required: '* Campo requerido',
								}}
								defaultValue={entity?.name}
							/>
						</div>
						<div className='mt-2'>
							<Select
								data={entityTypes}
								label='Tipo'
								name='entityTypeId'
								control={control}
								rules={{ required: '* Campo requerido' }}
								defaultValue={entity?.entityType?.id}
							/>
						</div>
						<div className='mt-2'>
							<AsyncComboBox
								rules={{ required: '* Campo requerido' }}
								name='businessId'
								normalizeData={{ id: 'id', name: 'name' }}
								control={control}
								label='Negocio Asociado'
								dataQuery={{ url: '/business' }}
								defaultValue={entity?.business.id}
								defaultItem={
									entity?.business
										? { id: entity.business.id, name: entity.business.name }
										: undefined
								}
							/>
						</div>

						<div className='mt-2'>
							<AsyncComboBox
								rules={{ required: '* Campo requerido' }}
								name='ownerId'
								normalizeData={{ id: 'id', name: ['fullName', 'email'] }}
								control={control}
								label='Responsable'
								dataQuery={{ url: '/user/external' }}
								defaultValue={entity?.owner.id}
								defaultItem={
									entity?.owner
										? { id: entity.owner.id, name: entity.owner.username }
										: undefined
								}
							/>
						</div>
						<div className='mt-2'>
							<Input
								name='phone'
								label='Teléfono'
								placeholder='Teléfono'
								control={control}
								textAsNumber
								defaultValue={entity?.phone}
							/>
						</div>
						<div className='mt-2'>
							<Input
								name='address'
								label='Dirección'
								placeholder='Dirección de la Entidad'
								control={control}
								defaultValue={entity?.address}
							/>
						</div>

						<div className='flex items-end'>
							<div className='flex flex-col w-full'>
								<span className='block w-full font-semibold text-sm'>
									Color
								</span>
								<Controller
									name='color'
									control={control}
									defaultValue={entity?.color}
									render={({ field }) => (
										<div className='flex items-center w-full'>
											<span
												className={`h-4/5 mt-1 border border-gray-400 rounded-md w-full hover:cursor-pointer`}
												style={{
													backgroundColor: `${field.value}`,
													height: 37,
												}}
												onClick={() => {
													setChangeColorValue({ onChange: field.onChange });
												}}
											/>
										</div>
									)}
								/>
							</div>
						</div>
						<div className='mt-7 flex items-center justify-center m-auto'>
							<Toggle
								name='allowCreateAccount'
								control={control}
								defaultValue={entity?.allowCreateAccount}
								title='Permitir solicitar tarjetas desde la APK'
							/>
						</div>
					</div>
				</div>

				{!!changeColorValue && (
					<Modal
						state={!!changeColorValue}
						close={() => setChangeColorValue(null)}
					>
						<ChangeColor
							close={() => setChangeColorValue(null)}
							changeValue={changeColorValue.onChange}
						/>
					</Modal>
				)}
			</div>
			<div className='grid grid-cols-2 gap-3 py-2 mt-2 mx-2'>
				<Button
					color='red-600'
					textColor='red-600'
					name='Eliminar'
					action={() => setDelAction(true)}
					full
					outline
				/>
				<Button color='indigo-700' name='Actualizar' full type='submit' loading={isFetching&&isSubmitting}  />
			</div>
			{delAction && (
				<Modal state={delAction} close={setDelAction}>
					<AlertContainer
						onAction={() => deleteEntity!(entity?.id, close)}
						onCancel={setDelAction}
						text='Seguro que desea eliminar esta entidad?'
						title={`Eliminar ${entity?.name}`}
						loading={isFetching}
					/>
				</Modal>
			)}
		</form>
	);
};

export default EditEntityGeneralInfo;

//Color Modal ----------------------------------
interface ChangeColor {
	current?: string;
	changeValue: Function;
	close: Function;
}

const ChangeColor = ({ changeValue, close, current }: ChangeColor) => {
	const [selected, setSelected] = useState(current);
	return (
		<div className='flex flex-col justify-center gap-y-5'>
			<div className='flex justify-center w-full'>
				<SliderPicker
					color={selected}
					onChangeComplete={(value) => setSelected(value.hex)}
					className='w-full'
				/>
			</div>
			<div className='mt-3 flex justify-end'>
				<Button
					color='indigo-600'
					action={() => {
						changeValue(selected);
						close();
					}}
					name='Aceptar'
				/>
			</div>
		</div>
	);
};
