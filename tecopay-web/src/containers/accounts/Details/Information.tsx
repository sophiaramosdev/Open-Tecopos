import { useState } from 'react';
import GenericList from '../../../components/misc/GenericList';

import { formatCardNumber } from '../../../utils/helpers';
import { PiHandCoins } from 'react-icons/pi';
import Modal from '../../../components/modals/GenericModal';
import StatusBadge from '../../../components/misc/badges/StatusBadge';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { SubmitHandler, useForm } from 'react-hook-form';
import Input from '../../../components/forms/Input';
import Button from '../../../components/misc/Button';
import { deleteUndefinedAttr } from '../../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { TrashIcon } from '@heroicons/react/24/outline';
import AlertContainer from '../../../components/misc/AlertContainer';
import Toggle from '../../../components/forms/Toggle';
import useServerAccounts from '../../../api/userServerAccounts';
import { BasicType } from '../../../interfaces/localInterfaces';
import { AccountInterface } from '../../../interfaces/serverInterfaces';

interface DetailInterface {
	info: AccountInterface;
	crud: {
		editAccount: Function;
		deleteAccount: Function;
		isFetching: boolean;
	};
}

const AccountDetail = ({ info, crud }: DetailInterface) => {
	const { editAccount, deleteAccount, isFetching } = crud;

	const { charge: chargeFunction } = useServerAccounts();

	const [rechargeModal, setRechargeModal] = useState(false);
	const [editModal, setEditModal] = useState(false);

	const actions = [
		{
			icon: <PencilSquareIcon className='w-10 h-5' />,
			title: 'Editar',
			action: () => {
				setEditModal(true);
			},
		},
		{
			icon: <PiHandCoins className='w-10 h-5' />,
			title: 'Recargar',
			action: () => {
				setRechargeModal(true);
			},
		},
	];

	//Data to list--------
	const header = { title: `Detalles de ${formatCardNumber(info?.address)}` };
	const body = {
		'No. cuenta': `${formatCardNumber(info?.address ?? '-')}`,

		Propietario: info?.owner?.fullName ?? '-',

		Entidad: info?.issueEntity?.name ?? '-',

		Negocio: info?.issueEntity?.business?.name ?? '-',

		'Total de Puntos': info?.amount ?? '-',

		Estado: <StatusBadge status={info?.isActive ? 'ACTIVE' : 'INACTIVE'} />,
	};

	return (
		<>
			<GenericList actions={actions} header={header} body={body} />

			{rechargeModal && (
				<Modal state={rechargeModal} close={setRechargeModal}>
					<Charge
						Charge={chargeFunction}
						isFetching={isFetching}
						defaultAddress={info ? parseInt(info.address) : 0}
						closeModal={() => setRechargeModal(false)}
					></Charge>
				</Modal>
			)}
			{editModal && (
				<Modal state={editModal} close={setEditModal} size='m'>
					<EditAccountContainer
						deleteAccount={deleteAccount}
						account={info}
						editAccount={editAccount}
						isFetching={isFetching}
						closeModal={() => setEditModal(false)}
					/>
				</Modal>
			)}
		</>
	);
};

export default AccountDetail;

interface propsInterface {
	defaultAddress?: number;
	Charge: Function;
	isFetching: boolean;
	closeModal: Function;
}

const Charge = ({
	defaultAddress,
	Charge,
	isFetching,
	closeModal,
}: propsInterface) => {
	const { control, handleSubmit, reset } = useForm({
		mode: 'onChange',
	});

	const id = 2;

	const onSubmit: SubmitHandler<Record<string, string | number>> = (data) => {
		let Str = defaultAddress ? defaultAddress?.toString() : '';
		let noSpace = Str.replace(/\s+/g, '');
		let dataTosend = {
			...data,
			address: noSpace,
		};
		Charge(deleteUndefinedAttr(dataTosend), id, closeModal);
	};
	return (
		<form className='flex flex-col' onSubmit={handleSubmit(onSubmit)}>
			<div className='flex flex-col gap-6 items-center w-full justify-center'>
				<p className='font-semibold text-lg text-center'>Recargar Cuenta</p>
				<Input
					defaultValue={defaultAddress}
					name='address'
					label='Cuenta a recargar'
					placeholder='xxxx xxxx xxxx'
					control={control}
					disabled={true}
				></Input>
				<Input
					name='amount'
					label='Cantidad'
					type='number'
					placeholder='0.00'
					rules={{
						required: 'Campo requerido',
						validate: (value) => {
							if (parseInt(value) === 0) {
								return 'El valor no puede ser cero';
							}
							return true;
						},
					}}
					control={control}
				></Input>
				<div className='flex self-end mt-4'>
					<Button
						name='Recargar'
						color='indigo-600'
						loading={isFetching}
						type='submit'
					/>
				</div>
			</div>
		</form>
	);
};

interface UserWizzardInterface {
	editAccount: Function;
	deleteAccount: Function;
	isFetching: boolean;
	closeModal: Function;
	account: any;
}

const EditAccountContainer = ({
	editAccount,
	isFetching,
	closeModal,
	deleteAccount,
	account,
}: UserWizzardInterface) => {
	const [delAction, setDelAction] = useState(false);

	const navigate = useNavigate();

	const id = 2;
	const { control, handleSubmit } = useForm<BasicType>({
		mode: 'onChange',
	});

	const onSubmit: SubmitHandler<any> = (data) => {
		editAccount(account?.id, deleteUndefinedAttr(data), closeModal);
	};
	return (
		<>
			<form onSubmit={handleSubmit(onSubmit)}>
				<div className='overflow-auto scrollbar-thin scrollbar-thumb-slate-100 pr-5 pl-2'>
					<div className='flex flex-col gap-5 mt-5'>
						<Input
							name='name'
							defaultValue={account?.address}
							label='Número de cuenta'
							control={control}
							disabled={true}
						/>

						<Input
							name='propietario'
							defaultValue={account?.owner?.fullName ?? '-'}
							label='Propietario'
							control={control}
							disabled={true}
						/>

						<div className='flex justify-around gap-5'>
							<Toggle
								name='isBlocked'
								defaultValue={account?.isBlocked}
								title='Cuenta bloqueada'
								control={control}
							></Toggle>

							<Toggle
								name='isActive'
								title='Cuenta activa'
								defaultValue={account?.isActive}
								control={control}
							></Toggle>
						</div>

						<div className='flex justify-between mt-5'>
							<Button
								color='red-600'
								action={() => {
									setDelAction(true);
								}}
								name='Eliminar cuenta'
								outline
								textColor='text-red-600'
								iconAfter={<TrashIcon className='text-red-600  w-4 h-4' />}
								type={'button'}
							/>
							<Button
								name='Insertar'
								color='indigo-600'
								type='submit'
								loading={isFetching}
								disabled={isFetching}
							/>
						</div>
					</div>
				</div>
			</form>

			{delAction && (
				<Modal state={delAction} close={setDelAction}>
					<AlertContainer
						onAction={() => deleteAccount(id, navigate('/accounts'))}
						onCancel={setDelAction}
						title={`Eliminar ${account?.name}`}
						text='¿Seguro que desea eliminar este usuario del sistema?'
						loading={isFetching}
					/>
				</Modal>
			)}
		</>
	);
};
