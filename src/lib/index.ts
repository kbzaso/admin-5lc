export function formatDateToChile(date: string) {
	const options = { year: 'numeric', month: 'long', day: 'numeric' };
	return new Intl.DateTimeFormat('es-CL', options).format(new Date(date));
}

// Function to format the price to CLP
export function formatPriceToCLP(price: number): string {
	return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
}
