export const translateCardRequestStatus = (status?: string) => {
	switch (status) {
		case 'PRINTED':
			return 'Impresa';
		case 'REQUESTED':
			return 'Pendiente';
		case 'ACCEPTED':
			return 'Aceptada';
		default:
			return '';
	}
};
