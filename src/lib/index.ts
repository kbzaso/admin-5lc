export function formatDateToChile(date: string | Date) {
	const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
	return new Intl.DateTimeFormat('es-CL', options).format(new Date(date));
}

// Function to format the price to CLP
export function formatPriceToCLP(price: number): string {
	return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
}

// Shared pill/chip styling for toggle buttons (filter chips, chart metric
// switches). Active chips are yellow; inactive ones are muted outlines.
export function chipClass(active: boolean): string {
	return `rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed ${
		active
			? 'border-yellow-400 bg-yellow-400 text-black'
			: 'border-base-content/25 text-base-content/50 hover:border-base-content/40 hover:text-base-content/80'
	}`;
}
