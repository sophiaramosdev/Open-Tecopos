import { type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import AsyncComboBox from '../../../components/forms/AsyncCombobox';
import Button from '../../../components/misc/Button';
import MultiSelect from '../../../components/forms/Multiselect';
import { deleteUndefinedAttr } from '../../../utils/helpers';
import { UserInterface } from '../../../interfaces/serverInterfaces';
import ComboBox from '../../../components/forms/Combobox';
import { useAppSelector } from '../../../store/hooks';
import { TrashIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useEffect, useState } from 'react';
import AlertContainer from '../../../components/misc/AlertContainer';
import Modal from '../../../components/modals/GenericModal';
import useServerUsers from '../../../api/userServerUsers';
import SpinnerLoading from '../../../components/misc/SpinnerLoading';
import { SelectInterface } from '../../../interfaces/localInterfaces';

interface propsDestructured {
	user: UserInterface;
	editUser: Function;
	isFetching: boolean;
	deleteUser: Function;
	close: Function;
}

const EditUserModal = ({
	user,
	editUser,
	close,
	isFetching,
	deleteUser,
}: propsDestructured) => {
	const { roles } = useAppSelector((state) => state.init);
	const {
		control,
		handleSubmit,
		formState: { isSubmitting },
	} = useForm();
	const { append, fields, remove } = useFieldArray<Record<string, any>>({
		control,
		name: 'roles',
	});

	const rolesSelector = roles.map((role) => ({ id: role.id, name: role.name }));

	const [deleteModal, setDeleteModal] = useState(false);

	useEffect(() => {
		if (user.roles.length !== 0 && fields.length === 0) {
			const roles = user.roles.map((rol) => ({
				roleId: rol.role.id,
				issueEntityId: rol.issueEntity.id,
			}));
			append(roles);
		}
	}, []);

	const onSubmit: SubmitHandler<
		Record<string, string | number | boolean | string[]>
	> = async (data) => {
		await editUser(user?.id, deleteUndefinedAttr(data), close);
	};

	return (
		<div className='h-full'>
			<div className='flex flex-col'>
				<div className='inline-flex gap-5 py-5'>
					<h3 className='text-base text-gray-800 font-semibold'>
						Nombre completo:
					</h3>
					<p className='text-gray-700'>{user?.fullName}</p>
				</div>

				<div className='inline-flex gap-5 py-5'>
					<h3 className='text-base text-gray-800 font-semibold'>
						Correo electrónico:
					</h3>
					<p className='text-gray-700'>{user?.email}</p>
				</div>
			</div>
			<form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
				<div className='min-h-32'>
					{fields.map((field: any, idx) => (
						<div className='inline-flex gap-2 w-full' key={idx}>
							<div className='grid grid-cols-2 gap-2 w-full'>
								<ComboBox
									name={`roles.${idx}.roleId`}
									control={control}
									label='Role *'
									rules={{ required: '* Campo requerido' }}
									data={rolesSelector}
									defaultValue={field.roleId}
								/>

								<AsyncComboBox
									name={`roles.${idx}.issueEntityId`}
									control={control}
									dataQuery={{
										url: '/entity',
									}}
									normalizeData={{ id: 'id', name: 'name' }}
									label='Entidad *'
									rules={{ required: '* Campo requerido' }}
									defaultItem={{
										id: user.roles[idx]?.issueEntity.id,
										name: user.roles[idx]?.issueEntity.name,
									}}
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
					<div className='mt-5 w-full self-end'>
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
				</div>

				<div className='mt-5 grid grid-cols-2 gap-2'>
					<Button
						color='red-600'
						textColor='red-600'
						name='Eliminar'
						icon={<TrashIcon className='h-5' />}
						action={() => setDeleteModal(true)}
						outline
						full
					/>
					<Button
						color='indigo-600'
						textColor='white'
						name={'Asignar'}
						type='submit'
						full
						loading={isFetching&&isSubmitting}
						disabled={isFetching}
					/>
				</div>
			</form>

			{deleteModal && (
				<Modal state={deleteModal} close={setDeleteModal}>
					<AlertContainer
						onAction={()=>deleteUser(user?.id, close)}
						onCancel={setDeleteModal}
						text='Seguro que desea eliminar?'
						title={`Eliminar usuario: ${user?.fullName ?? user?.email}`}
						loading={isFetching}
					/>
				</Modal>
			)}
		</div>
	);
};

export default EditUserModal;
