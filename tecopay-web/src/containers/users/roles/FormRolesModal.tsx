import {
	SubmitHandler,
	useForm,
	useFieldArray,
	UseFieldArrayAppend,
	UseFieldArrayRemove,
} from 'react-hook-form';
import Input from '../../../components/forms/Input';
import Button from '../../../components/misc/Button';
import { useEffect, useState } from 'react';
import Modal from '../../../components/modals/GenericModal';
import useServerMain from '../../../api/useServer';
import SpinnerLoading from '../../../components/misc/SpinnerLoading';
import Check from '../../../components/forms/GenericCheck';
import TextArea from '../../../components/forms/TextArea';
import { RolesInterface } from '../../../interfaces/serverInterfaces';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { GrUpdate } from 'react-icons/gr';
import AlertContainer from '../../../components/misc/AlertContainer';

interface FormRoles {
	close: Function;
	role?: RolesInterface;
}

const FormRoles = ({ close, role }: FormRoles) => {
	const { addRole, editRole, deleteRole, isFetching } = useServerMain();
	const [viewPermission, setviewPermission] = useState(false);
	const [deleteModal, setDeleteModal] = useState(false);

	const { handleSubmit, control, formState:{isSubmitting} } = useForm();
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'permissions',
	});

	const onSubmit: SubmitHandler<
		Record<string, string | number | boolean | string[] | any>
	> = async (data) => {
		data.permissions = data.permissions.map((elem: any) => elem.value);
		!!role ? await editRole(role.id, data, close) : addRole(data, close);
	};

	useEffect(() => {
		if (!!role && role.permissions.length !== 0)
			append(role.permissions.map((perm) => ({ value: perm.id })));
	}, []);

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='mt-3'>
			<div className='flex flex-col gap-y-4'>
				<Input
					name='name'
					label='Nombre'
					placeholder='Nombre del rol'
					control={control}
					rules={{ required: '* Campo requerido' }}
					defaultValue={role?.name}
				/>
				<Input
					name='code'
					label='Código'
					placeholder='Código del rol'
					control={control}
					rules={{ required: '* Campo requerido' }}
					defaultValue={role?.code}
				/>
				<TextArea
					name='description'
					label='Descripción'
					placeholder='Descripción del rol'
					control={control}
					rules={{ required: '* Campo requerido' }}
					defaultValue={role?.description}
				/>

				<div className='w-full mt-2'>
					<Button
						name='Asignar permisos'
						color='indigo-600'
						textColor='indigo-600'
						action={() => setviewPermission(true)}
						type='button'
						outline
						full
					/>
				</div>
			</div>
			<div className='grid grid-cols-2 gap-3 w-full mt-7'>
				{!!role ? (
					<Button
						color='red-600'
						textColor='red-600'
						name='Eliminar'
						icon={<TrashIcon className='h-5' />}
						action={() => setDeleteModal(true)}
						outline
					/>
				) : (
					<div></div>
				)}
				<Button
					name={`${!!role ? 'Actualizar' : 'Insertar'}`}
					color='indigo-600'
					icon={
						!!role ? (
							<GrUpdate className={`h-5 ${isFetching && isSubmitting && 'animate-spin'}`} />
						) : (
							<PlusIcon className='h-5' />
						)
					}
					type='submit'
					loading={!role && isFetching}
					disabled={isFetching}
				/>
			</div>
			{viewPermission && (
				<Modal state={viewPermission} close={setviewPermission} size='l'>
					<PermissionSelector
						append={append}
						fields={fields}
						remove={remove}
						close={() => setviewPermission(false)}
					/>
				</Modal>
			)}
			{deleteModal && (
				<Modal state={deleteModal} close={setDeleteModal}>
					<AlertContainer
						title={`Eliminar ${role?.name}`}
						text='Seguro que desea eliminar?'
						onAction={()=>deleteRole(role!.id, close)}
						onCancel={()=>setDeleteModal(false)}
						loading={isFetching}
					/>
				</Modal>
			)}
		</form>
	);
};

export default FormRoles;

//----------------------------------------------

interface PermissionModal {
	append: UseFieldArrayAppend<any, 'permissions'>;
	remove: UseFieldArrayRemove;
	fields: any;
	close: Function;
}

const PermissionSelector = ({
	append,
	remove,
	fields,
	close,
}: PermissionModal) => {
	const { getAllPermissions, isLoading, permissions } = useServerMain();
	useEffect(() => {
		getAllPermissions();
	}, []);

	const checked = (id: number) => {
		return fields.some((item: any) => item.value === id);
	};

	const checkOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.checked) {
			append({ value: Number(e.target.value) });
		} else {
			const idx = fields.findIndex(
				(item: number) => item === Number(e.target.value),
			);
			remove(idx);
		}
	};

	return isLoading ? (
		<div className='flex justify-center items-center w-full h-96'>
			<SpinnerLoading text='Cargando permisos del sistema' />
		</div>
	) : (
		<div className='flex flex-col gap-y-6 px-12 py-10 overflow-auto scrollbar-none relative'>
			{permissions.map((item, idx) => (
				<div className='py-8' key={idx}>
					<div className='relative w-3/4'>
						<span className='border border-t border-gray-300 w-full block' />
						<h3 className='text-lg text-gray-700 font-semibold absolute -top-3 left-3 bg-white px-1'>
							{item.category.toUpperCase()}
						</h3>
					</div>

					<div className='grid grid-cols-3 gap-10 pt-8'>
						{item.permissions.map((elem, idx) => (
							<div
								key={idx}
								className='flex gap-x-5 items-center border border-gray-300 px-4 py-2 rounded-md'
							>
								<Check
									value={elem.id}
									checked={checked(elem.id)}
									onChange={checkOnChange}
								/>
								<div className='flex flex-col'>
									<h3 className='text-md text gray-600 font-semibold'>
										{elem.name}
									</h3>
									<p className='text-justify'>{elem.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			))}
			<div className='inline-flex w-full justify-end'>
				<Button name='Aceptar' color='indigo-600' action={close} />
			</div>
		</div>
	);
};
