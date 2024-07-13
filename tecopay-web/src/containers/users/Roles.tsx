import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import GenericTable, {
	DataTableInterface,
} from '../../components/misc/GenericTable';
import Modal from '../../components/modals/GenericModal';
import Breadcrumb, {
	type PathInterface,
} from '../../components/navigation/Breadcrumb';
import { useState } from 'react';
import FormRoles from './roles/FormRolesModal';
import { useAppSelector } from '../../store/hooks';
import { RolesInterface } from '../../interfaces/serverInterfaces';

const Roles = () => {
	const { roles } = useAppSelector((state) => state.init);

	const [addRolesmodal, setAddRolesmodal] = useState(false);
	const [editRoleModal, setEditRoleModal] = useState<RolesInterface | null>(
		null,
	);

	// Breadcrumb-----------------------------------------------------------------------------------
	const paths: PathInterface[] = [
		{
			name: 'Roles',
		},
	];
	// ------------------------------------------------------------------------------------

	// Data for table ------------------------------------------------------------------------
	const tableTitles = ['Nombre', 'Descripción'];
	const tableData: DataTableInterface[] = [];

	roles.forEach((item: RolesInterface) => {
		tableData.push({
			rowId: item.id,
			payload: {
				Nombre: item?.name,
				Descripción: item?.description ?? '-',
			},
		});
	});

	const actions = [
		{
			icon: <PlusIcon className='h-5' />,
			title: 'Agregar Rol',
			action: () => {
				setAddRolesmodal(true);
			},
		},
	];

	const rowAction = (id: number) => {
		const currentRole = roles.find((role) => role.id === id);
		setEditRoleModal(currentRole!);
	};

	//--------------------------------------------------------------

	return (
		<div>
			<Breadcrumb
				icon={<UsersIcon className='h-6 text-gray-500' />}
				paths={paths}
			/>
			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				actions={actions}
				rowAction={rowAction}
			/>

			{addRolesmodal && (
				<Modal state={addRolesmodal} close={setAddRolesmodal}>
					<FormRoles close={() => setAddRolesmodal(false)} />
				</Modal>
			)}

			{!!editRoleModal && (
				<Modal state={!!editRoleModal} close={() => setEditRoleModal(null)}>
					<FormRoles
						close={() => setEditRoleModal(null)}
						role={editRoleModal}
					/>
				</Modal>
			)}
		</div>
	);
};

export default Roles;
