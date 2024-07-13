import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb, {
	PathInterface,
} from '../../components/navigation/Breadcrumb';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import SideNav from '../../components/navigation/SideNav';
import AssociatedCards from './Details/AssociatedCards';
import AssociatedOperations from './Details/AssociatedOperations';
import AccountDetail from './Details/Information';
import useServerAccounts from '../../api/userServerAccounts';
import SpinnerLoading from '../../components/misc/SpinnerLoading';

const AccountDetails = () => {
	const {
		getAccountInfo,
		getAccountOperations,
		account,
		operations,
		editAccount,
		deleteAccount,
		isLoading,
		isFetching,
		paginate
	} = useServerAccounts();

	const { accountId } = useParams();

	useEffect(() => {
		getAccountInfo!(accountId!);
	}, []);

	const navigate = useNavigate();
	const [current, setCurrent] = useState<string>('details');
	const changeTab = (to: string) => setCurrent(to);

	const stockTabs = [
		{
			name: 'Información',
			href: 'details',
			current: current === 'details',
		},
		{
			name: 'Tarjetas asociadas',
			href: 'cards',
			current: current === 'cards',
		},
		{
			name: 'Operaciones',
			href: 'operations',
			current: current === 'operations',
		},
	];

	//Breadcrumb --------------------------------------------------------------------------

	const paths: PathInterface[] = [
		{
			name: 'Cuentas',
			action: () => navigate('/accounts'),
		},

		{
			name: 'Detalles',
		},
	];
	//--------------------------------------------------------------------------------------

	if (isLoading) {
		return (
			<div className='h-full w-full flex justify-center items-center'>
				<SpinnerLoading text='Cargando información de la cuenta' />
			</div>
		);
	}

	return (
		<>
			<div className='flex'>
				<Breadcrumb
					icon={<UserCircleIcon className='h-7 text-gray-500' />}
					paths={paths}
				/>
			</div>
			<div className='sm:grid grid-cols-10 gap-3'>
				<SideNav
					tabs={stockTabs}
					action={changeTab}
					className='col-span-10 sm:col-span-2'
				/>

				<div className='sm:col-span-8 pl-3 pt-1'>
					{current === 'details' && (
						<AccountDetail
							info={account!}
							crud={{ deleteAccount, editAccount, isFetching }}
						/>
					)}
					{current === 'cards' && <AssociatedCards cards={account?.cards} />}
					{current === 'operations' && (
						<AssociatedOperations
							operations={operations}
							getAccountOperations={getAccountOperations}
							paginate={paginate!}
							isFetching={isFetching}
						/>
					)}
				</div>
			</div>
		</>
	);
};

export default AccountDetails;
