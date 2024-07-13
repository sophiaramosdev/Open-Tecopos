import React, { useEffect } from 'react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import AsyncComboBox from '../../../components/forms/AsyncCombobox';
import Button from '../../../components/misc/Button';
import useServerUsers from '../../../api/userServerUsers';
import InlineRadio from '../../../components/forms/InlineRadio';
import { useAppSelector } from '../../../store/hooks';
import ComboBox from '../../../components/forms/Combobox';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Input from '../../../components/forms/Input';
import { validateEmail } from '../../../utils/helpers';
import { deleteUndefinedAttr } from '../../../utils/helpersAdmin';

interface propsDestructured {
	close: Function;
	crud: {
		registerNewUser: Function;
		addFromTecopos: Function;
		isFetching: boolean;
	};
}

const NewUserModal = ({ close, crud }: propsDestructured) => {
	const { roles } = useAppSelector((state) => state.init);
	const { handleSubmit, control, watch } = useForm();
	const { append, fields, remove } = useFieldArray<Record<string, any>>({
		control,
		name: 'roles',
	});

	const {addFromTecopos, registerNewUser, isFetching} = crud

	const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
		const type = data.addType;
		delete data.addType;
		if (type === 'fromIdentity') {
			['email', 'firstName', 'lastName', 'username'].forEach(
				(item) => delete data[item],
			);
			addFromTecopos(data, close);
		} else {
			delete data.userId;
			registerNewUser(data, close);
		}
	};

	const rolesSelector = roles.map((role) => ({ id: role.id, name: role.name }));

	return (
		<div>
			<h3 className='text-lg font-semibold text-gray-600'>Añadir usuario</h3>
			<form
				onSubmit={handleSubmit(onSubmit)}
				className='pt-5 flex flex-col gap-y-3'
			>
				<InlineRadio
					data={[
						{ label: 'Usuario de Identidad', value: 'fromIdentity' },
						{ label: 'Nuevo registro', value: 'newRegister' },
					]}
					name='addType'
					control={control}
					defaultValue={'fromIdentity'}
				/>

				{watch('addType') === 'newRegister' ? (
					<div className='flex flex-col gap-y-5'>
						<Input
							label='* Correo electrónico'
							name='email'
							control={control}
							rules={{
								required: '* Campo requerido',
								validate: {
									isEmail: (value) => validateEmail(value)||"Correo no válido",
								},
							}}
						/>
						<Input label='Nombre' name='firstName' control={control} />
						<Input label='Apellidos' name='lastName' control={control} />
						<Input label='Teléfono' name='phone' control={control} />
					</div>
				) : (
					<AsyncComboBox
						name='externalId'
						control={control}
						dataQuery={{ url: '/user/external' }}
						normalizeData={{ id: 'id', name: 'email' }}
						label='Correo electrónico *'
						rules={{ required: '* Campo requerido' }}
					/>
				)}

				{fields.map((field: any, idx) => (
					<div className='inline-flex gap-2 w-full' key={idx}>
						<div className='grid grid-cols-2 gap-2 w-full'>
							<ComboBox
								name={`roles.${idx}.roleId`}
								control={control}
								label='Role *'
								rules={{ required: '* Campo requerido' }}
								data={rolesSelector}
								defaultValue={field.role}
							/>

							<AsyncComboBox
								name={`roles.${idx}.issueEntityId`}
								control={control}
								dataQuery={{
									url: '/entity',
									defaultParams: field.issueEntityId ? { page: 1 } : undefined,
								}}
								normalizeData={{ id: 'id', name: 'name' }}
								label='Entidad *'
								rules={{ required: '* Campo requerido' }}
								defaultValue={field.issueEntityId}
							/>
						</div>
						<div className='pt-6'>
							<Button
								color='red-600'
								textColor='red-600'
								icon={<TrashIcon className='h-6' />}
								action={() => remove(idx)}
								outline
							/>
						</div>
					</div>
				))}

				<div className='mt-5 w-full'>
					<Button
						color='indigo-600'
						textColor='indigo-600'
						name={`${fields.length === 0 ? 'Asignar roles' : 'Nuevo role'}`}
						action={() =>
							append({ roleId: undefined, issueEntityId: undefined })
						}
						icon={fields.length !== 0 && <PlusIcon className='h-5' />}
						type='button'
						outline
						full
					/>
				</div>

				<div className='flex w-full justify-end py-7'>
					<div className='w-1/2'>
						<Button
							color='indigo-600'
							name='Agregar'
							type='submit'
							loading={isFetching}
							disabled={isFetching}
							full
						/>
					</div>
				</div>
			</form>
		</div>
	);
};

export default NewUserModal;
