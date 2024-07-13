import { useContext, useState } from 'react';
import { NewEntityContext } from './NewEntityModal';
import Input from '../../../components/forms/Input';
import Button from '../../../components/misc/Button';
import Toggle from '../../../components/forms/Toggle';
import AsyncComboBox from '../../../components/forms/AsyncCombobox';
import GenericImageDrop from '../../../components/Images/GenericImageDrop';
import Select from '../../../components/forms/Select';
import { Controller } from 'react-hook-form';
import { SliderPicker } from 'react-color';
import Modal from '../../../components/modals/GenericModal';
import { useAppSelector } from '../../../store/hooks';

const EntityGeneralInfo = () => {
	const { control, setCurrentStep, trigger, getValues, setValue, fields } =
		useContext(NewEntityContext);
	const {entityTypes} = useAppSelector(state=>state.init);

	const {
		name,
		businessId,
		business,
		ownerId,
		owner,
		phone,
		address,
		allowCreateAccount,
	} = getValues!();

	const [changeColorValue, setChangeColorValue] = useState<{
		onChange: Function;
	} | null>(null);

	const verifyFields = async () => {
		if (await trigger!(['businessId', 'name', 'ownerId'])) {
			fields.length === 0 && setValue!('newCardType', true);
			setCurrentStep!(1);
		}
	};

	const persistSelectorInfo = (input: 'business' | 'owner', name: string) =>
		setValue!(input, name);

	return (
		<>
			<div className='border border-slate-300 rounded p-2 py-3'>
				<div className='h-full'>
					<div className='mt-2'>
						<GenericImageDrop
							className='h-40 w-40 rounded-full border border-gray-400 m-auto overflow-hidden'
							control={control}
							name='profileImageId'
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
								defaultValue={name}
							/>
						</div>
						<div className='mt-2'>
							<Select
								data={entityTypes}
								label='Tipo'
								name='entityTypeId'
								control={control}
								rules={{ required: '* Campo requerido' }}
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
								callback={(value) =>
									persistSelectorInfo('business', value.name)
								}
								defaultItem={
									businessId ? { id: businessId, name: business } : undefined
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
								callback={(value) => persistSelectorInfo('owner', value.name)}
								defaultItem={ownerId ? { id: ownerId, name: owner } : undefined}
							/>
						</div>
						<div className='mt-2'>
							<Input
								name='phone'
								label='Teléfono'
								placeholder='Teléfono'
								control={control}
								textAsNumber
								defaultValue={phone}
							/>
						</div>
						<div className='mt-2'>
							<Input
								name='address'
								label='Dirección'
								placeholder='Dirección de la Entidad'
								control={control}
								defaultValue={address}
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
								defaultValue={allowCreateAccount ?? false}
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
				<div>{/*Empty space for button*/}</div>
				<Button
					color='indigo-700'
					name='Siguiente'
					action={verifyFields}
					full
				/>
			</div>
		</>
	);
};

export default EntityGeneralInfo;

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
