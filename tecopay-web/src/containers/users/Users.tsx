import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import GenericTable, {
	DataTableInterface,
} from '../../components/misc/GenericTable';
import useServerUsers from '../../api/userServerUsers';
import Paginate from '../../components/misc/Paginate';
import Modal from '../../components/modals/GenericModal';
import Breadcrumb, {
	type PathInterface,
} from '../../components/navigation/Breadcrumb';
import { useEffect, useState } from 'react';
import EditUserModal from './editUseWizzard/EditUserModal';
import { UserInterface } from '../../interfaces/serverInterfaces';
import NewUserModal from './NewUser/NewUserModal';

const Users = () => {
	const {
		paginate,
		isLoading,
		allUsers,
		getAllUsers,
		assignUserRoles,
		deleteUser,
		registerNewUser,
		addFromTecopos,
		isFetching,
	} = useServerUsers();

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({});
	const [addUserModal, setAddUserModal] = useState(false);
	const [editUserModal, setEditUserModal] = useState<UserInterface | null>(
		null,
	);

	useEffect(() => {
		getAllUsers(filter);
	}, [filter]);

	const setCurrentUser = (id: number) => {
		const current = allUsers.find((user) => user.id === id);
		setEditUserModal(current!);
	};

	// Data for table ------------------------------------------------------------------------
	const tableTitles = ['Nombre', 'Correo Electrónico', 'Entidad', 'Roles'];
	const tableData: DataTableInterface[] = [];

	allUsers?.forEach((item) => {
		tableData.push({
			rowId: item.id,
			payload: {
				Nombre: item?.fullName,
				Entidad:
					item?.roles.length !== 0 ? (
						<div className='flex flex-col gap-y-1'>
							{item?.roles?.map((rol, idx) => (
								<p key={idx}>{rol.issueEntity.name}</p>
							))}
						</div>
					) : (
						'-'
					),
				'Correo Electrónico': item.email ?? '-',
				Roles:
					item?.roles.length !== 0 ? (
						<div className='flex flex-col gap-y-1'>
							{item?.roles?.map((rol, idx) => <p key={idx}>{rol.role.name}</p>)}
						</div>
					) : (
						'Usuario de la aplicación'
					),
			},
		});
	});

	const searching = {
		action: (search: string) => {
			setFilter({ ...filter, search });
		},
		placeholder: 'Buscar usuario',
	};

	const actions = [
		{
			icon: <PlusIcon className='h-5' />,
			title: 'Agregar usuario',
			action: () => {
				setAddUserModal(true);
			},
		},
	];

	// Breadcrumb-----------------------------------------------------------------------------------
	const paths: PathInterface[] = [
		{
			name: 'Usuarios',
		},
	];
	// ------------------------------------------------------------------------------------

	return (
		<div>
			<Breadcrumb
				icon={<UsersIcon className='h-6 text-gray-500' />}
				paths={paths}
			/>
			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				loading={isLoading}
				searching={searching}
				actions={actions}
				rowAction={setCurrentUser}
				// filterComponent={{ availableFilters, filterAction }}
				paginateComponent={
					<Paginate
						action={(page: number) => {
							setFilter({ ...filter, page });
						}}
						data={paginate}
					/>
				}
			/>

			{!!editUserModal && (
				<Modal state={!!editUserModal} close={() => setEditUserModal(null)} size='m'>
					<EditUserModal
						close={() => setEditUserModal(null)}
						editUser={assignUserRoles}
						user={editUserModal}
						isFetching={isFetching}
						deleteUser={deleteUser}
					/>
				</Modal>
			)}
			{addUserModal && (
				<Modal state={addUserModal} close={setAddUserModal} size='m'>
					<NewUserModal close={() => setAddUserModal(false)} crud={{addFromTecopos, registerNewUser, isFetching}} />
				</Modal>
			)}
		</div>
	);
};

export default Users;
