import { SubmitHandler, useForm } from 'react-hook-form';
import useServerAccounts from '../../../api/userServerAccounts';
import Input from '../../../components/forms/Input';
import Button from '../../../components/misc/Button';

const ChargeCardAccount = ({
	cardAddress,
	close,
}: {
	cardAddress: string;
	close: Function;
}) => {
	const { control, handleSubmit } = useForm();
	const { charge, isFetching } = useServerAccounts();

	const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
		charge({ address: cardAddress, amount: data.amount }, close);
	};
	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<Input
				name='amount'
				label='* Monto'
				rules={{ required: '* Ingrese un monto' }}
				control={control}
			/>
			<div className='flex justify-end pt-5'>
				<Button
					name='Recargar'
					type='submit'
					color='indigo-600'
					loading={isFetching}
					disabled={isFetching}
				/>
			</div>
		</form>
	);
};

export default ChargeCardAccount;
