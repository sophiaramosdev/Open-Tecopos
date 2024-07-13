import { useState, useEffect } from 'react';
import GenericTable, {
	DataTableInterface,
} from '../../../components/misc/GenericTable';
import Paginate from '../../../components/misc/Paginate';
import { formatCalendar, formatCardNumber } from '../../../utils/helpers';
import { CardInterface } from '../../../interfaces/serverInterfaces';
import moment from 'moment';

interface AccountCards {
	cards?: CardInterface[];
}

const AssociatedCards = ({ cards }: AccountCards) => {
	const tableTitles = [
		'No. Tarjeta',
		'Titular',
		'Categoría',
		'Fecha de Expiración',
	];

	const tableData: DataTableInterface[] = [];
	cards?.map((item: any) => {
		tableData.push({
			rowId: item.id,
			payload: {
				'No. Tarjeta': formatCardNumber(item?.address),
				Titular: item?.holderName ?? '-',
				Categoría: item?.category?.name ?? '-',
				'Fecha de Expiración': moment(item.createdAt).format(
					'DD/MM/YYYY h:mm:ssA',
				),
			},
		});
	});

	return (
		<>
			<GenericTable tableData={tableData} tableTitles={tableTitles} />
		</>
	);
};

export default AssociatedCards;
