import { PlusIcon } from '@heroicons/react/24/outline';
import GenericTable, {
	DataTableInterface,
} from '../../components/misc/GenericTable';
import Paginate from '../../components/misc/Paginate';
import Modal from '../../components/modals/GenericModal';
import Breadcrumb, {
	PathInterface,
} from '../../components/navigation/Breadcrumb';
import { useEffect, useState } from 'react';
import useServerEntity from '../../api/userServerEntity';
import { HomeModernIcon } from '@heroicons/react/24/outline';
import EditEntityModal from './editEntityModal/EditEntityModal';
import StatusBadge from '../../components/misc/badges/StatusBadge';
import NewEntityModal from './newEntityModal/NewEntityModal';
import { controller } from '../../api/APIServices';
import { useNavigate } from 'react-router-dom';

const Entity = () => {
	const navigate = useNavigate();
	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({});
	const [addEntityModal, setAddEntityModal] = useState(false);
	const [editEntityModal, setEditEntityModal] = useState<number | null>(null);

	const {
		getAllEntity,
		getEntity,
		updateEntity,
		allEntity,
		entity,
		isLoading,
		paginate,
		addEntity,
		deleteEntity,
		addCategory,
		updateCategory,
		deleteCategory,
		isFetching,
	} = useServerEntity();

	useEffect(() => {
		getAllEntity(filter);
	}, [filter]);
	//Breadcrumb------------------------------------------------------------------------------------

	const paths: PathInterface[] = [
		{
			name: 'Entidades',
		},
	];

	//Table ------------------------------------------------------------------------------------------

	const tableTitles = [
		'Nombre',
		'Responsable',
		'Negocio',
		'Teléfono',
		'Dirección',
		'Estado',
	];

	const tableData: DataTableInterface[] = [];

	allEntity?.forEach((item: any) => {
		tableData.push({
			rowId: item.id,
			payload: {
				Nombre: item?.name,
				Responsable: item?.owner?.username ? item?.owner?.username : '-',
				Negocio: item?.business?.name ?? '-',
				Teléfono: item.phone,
				Estado: <StatusBadge status={item.status} />,
				Dirección: item.address,
			},
		});
	});

	const actions = [
		{
			icon: <PlusIcon className='h-5' />,
			title: 'Agregar entidad',
			action: () => setAddEntityModal(true),
		},
	];

	const rowAction = (id: number) => {
		setEditEntityModal(id)
	};
	return (
		<div>
			<Breadcrumb
				icon={<HomeModernIcon className='h-6 text-gray-500' />}
				paths={paths}
			/>

			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				loading={isLoading && !entity}
				actions={actions}
				rowAction={rowAction}
				searching={{
					action: (search: string) => setFilter({ search, page: 1 }),
					placeholder: 'Buscar por nombre de entidad',
				}}
				paginateComponent={
					<Paginate
						action={(page: number) => setFilter({ ...filter, page })}
						data={paginate}
					/>
				}
			/>

			{/*New Entity Modal*/}
			{addEntityModal && (
				<Modal
					state={addEntityModal}
					close={() => setAddEntityModal(false)}
					size='m'
				>
					<NewEntityModal
						close={() => setAddEntityModal(false)}
						crud={{ addEntity, isFetching }}
					/>
				</Modal>
			)}

			{/*Modal to Edit Entity*/}
			{editEntityModal && (
				<Modal
					state={!!editEntityModal}
					close={() => setEditEntityModal(null)}
					size='m'
				>
					<EditEntityModal
						id={editEntityModal}
						close={() => setEditEntityModal(null)}
						crud={{
							updateEntity,
							deleteEntity,
							isFetching,
							getEntity,
							entity,
							addCategory,
							updateCategory,
							deleteCategory,
							isLoading,
						}}
					/>
				</Modal>
			)}
		</div>
	);
};

export default Entity;
