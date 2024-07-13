import { Route, Routes } from 'react-router-dom';
import NotFoundpage from '../pages/NotFoundPage';
import 'react-toastify/dist/ReactToastify.css';
import AppContainer from '../containers/AppContainer';
import { lazy, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import useServerMain from '../api/useServer';
import Loading from '../components/misc/Loading';

const AppRoute = () => {
	const { user, allowedPermissions } = useAppSelector((state) => state.init);
	const { initSystem, isLoading } = useServerMain();

	useEffect(() => {
		initSystem();
	}, []);

	//Permissions by modules--------

	const permissions = {
		entityAccess:
			allowedPermissions.some((elem) =>
				['ENTITIES_VIEW', 'ENTITIES_EDIT'].includes(elem),
			) || !!user?.isSuperAdmin,
		accountAccess:
			allowedPermissions.some((elem) =>
				[
					'ACCOUNTS_FULL',
					'ACCOUNTS_DELETE',
					'ACCOUNTS_EDIT',
					'ACCOUNTS_RELOAD',
				].includes(elem),
			) || !!user?.isSuperAdmin,
		requestAccess:
			allowedPermissions.some((elem) =>
				[
					'REQUESTS_FULL',
					'REQUESTS_CREATE',
					'REQUESTS_UPDATE',
					'REQUESTS_DELETE',
				].includes(elem),
			) || !!user?.isSuperAdmin,
		cardAccess:
			allowedPermissions.some((elem) =>
				['CARDS_FULL', 'CARDS_VIEW', 'CARDS_UPDATE'].includes(elem),
			) || !!user?.isSuperAdmin,
		userAccess:
			allowedPermissions.some((elem) =>
				[
					'USERS_FULL',
					'USERS_VIEW',
					'USERS_CREATE',
					'USERS_EDIT',
					'USERS_DELETE',
				].includes(elem),
			) || !!user?.isSuperAdmin,
	};

	//-----------------------------------

	const LazyDashboard = lazy(() => import('../pages/DashboardPage'));
	const LazyAccounts = lazy(() => import('../containers/accounts/Accounts'));
	const LazyCard = lazy(() => import('../containers/card/Cards'));
	const LazyCardRequests = lazy(
		() => import('../containers/request/CardRequests'),
	);
	const LazyEntity = lazy(() => import('../containers/entity/Entity'));

	const LazyRoles = lazy(() => import('../containers/users/Roles'));

	const LazyAccountDetails = lazy(
		() => import('../containers/accounts/AccountDetails'),
	);
	const LazyUsers = lazy(() => import('../containers/users/Users'));
	const LazyTransaccions = lazy(
		() => import('../containers/analitics/Transaccions'),
	);
	const LazyTraces = lazy(() => import('../containers/analitics/Traces'));
	const LazyUserOfCategorys = lazy(
		() => import('../containers/analitics/UserOfCategorys'),
	);

	if (isLoading) {
		return (
			<div className='flex w-full h-full justify-center items-center'>
				<Loading />
			</div>
		);
	}

	return (
		<Routes>
			<Route path='/' element={<AppContainer permissions={permissions} />}>
				<Route index Component={LazyDashboard} />
				{permissions.entityAccess && (
					<Route path='/entities' Component={LazyEntity} />
				)}
				{permissions.accountAccess && (
					<>
						<Route path='/accounts' Component={LazyAccounts} />
						<Route path='/accounts/:accountId' Component={LazyAccountDetails} />
					</>
				)}

				{permissions.cardAccess && (
					<Route path='/cards/' Component={LazyCard} />
				)}
				{permissions.requestAccess && (
					<Route path='/requests' Component={LazyCardRequests} />
				)}
				{permissions.userAccess && (
					<Route path='/users' Component={LazyUsers} />
				)}
				<Route path='/config/roles' Component={LazyRoles} />
				<Route path='/analitics/transaccions' Component={LazyTransaccions} />
				<Route path='/analitics/traces' Component={LazyTraces} />
				<Route
					path='/analitics/userOfCategorys'
					Component={LazyUserOfCategorys}
				/>
			</Route>
			<Route path='/*' element={<NotFoundpage />} />
		</Routes>
	);
};

export default AppRoute;
