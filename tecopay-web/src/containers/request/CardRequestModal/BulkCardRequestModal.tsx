import { useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import TextArea from '../../../components/forms/TextArea';
import { deleteUndefinedAttr } from '../../../utils/helpers';
import Input from '../../../components/forms/Input';
import Button from '../../../components/misc/Button';
import Select from '../../../components/forms/Select';
import AsyncComboBox from '../../../components/forms/AsyncCombobox';
import userServerAccounts from '../../../api/userServerAccounts';
import useServerCardsRequests from '../../../api/userServerCardsRequests';

interface propsBulkDestructured {
	close: Function;
}

const BulkCardRequestModal = ({ close }: propsBulkDestructured) => {
	const CRUD = useServerCardsRequests();

	const { control, handleSubmit } = useForm();
	const [associate, setAssociate] = useState('none');
	const [entity, setEntity] = useState<Record<string, string | number>>({});
	const [account, setAccount] = useState<Record<
		string,
		string | number
	> | null>({});
	let dataTosend: any;

	function resetAssociate(params: string) {
		setEntity({});
		setAccount(null);
		setAssociate(params);
	}

	const { getAccountInfo } = userServerAccounts();

	const onSubmit: SubmitHandler<
		Record<string, string | number | boolean | string[]>
	> = (data) => {
		if (associate === 'Entidad') {
			delete data.accountId;
		} else if (associate === 'Cuenta') {
			delete data.issueEntityId;
		}

		if (data.priority === 'Normal')
			dataTosend = {
				...data,
				priority: 'NORMAL',
			};
		else
			dataTosend = {
				...data,
				priority: 'EXPRESS',
			};
		delete dataTosend.associate;
		CRUD.addCardRequest(deleteUndefinedAttr(dataTosend), close);
	};

	return (
		<main>
			<div>
				<p className='mb-4 font-semibold text-lg text-center'>
					Nueva solicitud por Bulto
				</p>
				<form
					className='flex flex-col gap-y-5'
					onSubmit={handleSubmit(onSubmit)}
				>
					<Input
						name='quantity'
						label='Cantidad'
						placeholder='Cantidad'
						control={control}
						rules={{ required: 'Campo requerido' }}
					></Input>

					<Select
						control={control}
						name='priority'
						label='Prioridad'
						data={[
							{ id: 1, name: 'Normal' },
							{ id: 2, name: 'Express' },
						]}
					></Select>

					<Select
						control={control}
						name='associate'
						rules={{ required: 'Campo requerido' }}
						label='Asociar a:'
						data={[
							{ id: 1, name: 'Entidad' },
							{ id: 2, name: 'Cuenta' },
						]}
						setSelectedToParent={resetAssociate}
					></Select>

					{associate === 'Entidad' && (
						<>
							<AsyncComboBox
								rules={{ required: 'Campo requerido' }}
								name='issueEntityId'
								normalizeData={{ id: 'id', name: 'name' }}
								control={control}
								label='Entidad'
								dataQuery={{ url: '/entity' }}
								setSelectedDataToParent={setEntity}
							></AsyncComboBox>
							{entity?.id && (
								<AsyncComboBox
									rules={{ required: 'Campo requerido' }}
									name='categoryId'
									normalizeData={{ id: 'id', name: 'name' }}
									control={control}
									label='Categoría'
									dataQuery={{ url: `/entity/${entity?.id}/categories` }}
								></AsyncComboBox>
							)}
						</>
					)}

					{associate === 'Cuenta' && (
						<>
							<AsyncComboBox
								rules={{ required: 'Campo requerido' }}
								name='accountId'
								normalizeData={{ id: 'id', name: 'address' }}
								control={control}
								label='Cuenta'
								dataQuery={{ url: '/account' }}
								//setSelectedDataToParent={getEntityFromAccount}
							></AsyncComboBox>
							{account && (
								<AsyncComboBox
									rules={{ required: 'Campo requerido' }}
									name='categoryId'
									normalizeData={{ id: 'id', name: 'name' }}
									control={control}
									label='Categoría'
									dataQuery={{ url: `/entity/${account}/categories` }}
								></AsyncComboBox>
							)}
						</>
					)}
					<div className='h-full'>
						<TextArea
							name='observations'
							control={control}
							paddingInput='py-0'
							label='Observaciones'
							rules={{
								maxLength: {
									value: 150,
									message:
										'las observaciones deben tener como máximo 150 carácteres',
								},
							}}
						></TextArea>
					</div>

					<div className='flex self-end'>
						<Button
							name='Insertar'
							color='indigo-600'
							type='submit'
							loading={CRUD.isFetching}
							disabled={CRUD.isFetching}
						/>
					</div>
				</form>
			</div>
		</main>
	);
};

export default BulkCardRequestModal;
