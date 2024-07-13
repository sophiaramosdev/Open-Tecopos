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

import { useNavigate } from 'react-router-dom';

import useServerRoles from '../../api/useServerRoles';
import { Interface } from 'readline';
import StatusBadge from '../../components/misc/badges/StatusBadge';
import { ChartBarOutline } from 'heroicons-react';

interface Roles {
	id: number;
	name: string;
	code: string;
	description: string;
	permissions: any;
}

const exists = true;

const UserofCategory = () => {
	const {
		paginate,
		isLoading,
		allRoles,
		isFetching,
		role,
		getAllPermissions,
		allPermissions,
		getAllRoles,
		registerRoles,
	} = useServerRoles();

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({});
	const [addRolesmodal, setAddRolesmodal] = useState(false);
	const [selectedOption, setSelectedOption] = useState('');
	// const [exportModal, setExportModal] = useState(false);

	/* useEffect(() => {
			  getAllClients(filter);
			}, [filter]); */

	// Data for table ------------------------------------------------------------------------
	const tableTitles = ['Nombre', 'Descripción', 'Acciones'];
	const tableData: DataTableInterface[] = [];

	allRoles?.map((item: Roles) => {
		tableData.push({
			rowId: item.id,
			payload: {
				Nombre: item?.name,
				Descripción: item?.description ?? '-',


			},
		});
	});

	const navigate = useNavigate();

	const searching = {
		action: (search: string) => {
			setFilter({ ...filter, search });
		},
		placeholder: 'Buscar rol',
	};
	const close = () => {
		setEditUserModal({ state: false, id: null });
	};
	const actions = [
		{
			icon: <PlusIcon className='h-5' />,
			title: 'Agregar Rol',
			action: () => {
				setAddRolesmodal(true);
			},
		},
	];

	// Breadcrumb-----------------------------------------------------------------------------------
	const paths: PathInterface[] = [
		{
			name: 'Usuarios por categorías',
		},
	];
	// ------------------------------------------------------------------------------------
	const [nuevoUserModal, setNuevoUserModal] = useState(false);
	const [contactModal, setContactModal] = useState(false);
	const [editUserModal, setEditUserModal] = useState<{
		state: boolean;
		id: number | null;
	}>({ state: false, id: null });

	const closeAddUser = () => {
		setAddRolesmodal(false);
	};

	useEffect(() => {
		getAllPermissions(filter);
		getAllRoles(filter);
	}, [filter]);

	return (
		<div>
			<Breadcrumb
				icon={<ChartBarOutline className='h-6 text-gray-500' />}
				paths={paths}
			/>
			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				loading={isLoading}
				searching={searching}
				actions={actions}
				//	rowAction={rowAction}
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

			{/*editUserModal.state && (
				<Modal state={editUserModal.state} close={setEditUserModal}>
					<p className='mb-4 font-semibold text-lg text-center'>
						Editar usuario
					</p>
					<EditUserModal
						close={close}
						isLoading={isLoading}
						editUser={editUser}
						getUser={getUser}
						id={editUserModal.id}
						user={user}
						allUsers={allUsers}
					/>
				</Modal>
			) */}
			{addRolesmodal && (
				<Modal state={addRolesmodal} close={setAddRolesmodal}>
					<div className='flex flex-col gap-4'>
						<p className='mb-4 font-semibold text-lg '>Nuevo Rol</p>

						{/*selectedOption === 'option1' && (
							<NewUserModalVariantOne
								close={closeAddUser}
								isLoading={isLoading}
								registerUser={registerUser}
							/>
						)*/}
					</div>
					{/*selectedOption === 'option2' && (
						<NewUserModalVariantTwo
							close={closeAddUser}
							isLoading={isLoading}
							addFromTecopos={addFromTecopos}
						/>
					)*/}
					{/*<AddRolesModal
						close={close}
						isLoading={isLoading}
						editUser={registerRoles}
						user={role}
						id={allPermissions.id}
					/>*/}
				</Modal>
			)}
		</div>
	);
};

export default UserofCategory;
