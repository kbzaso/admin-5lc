// import imageUrlBuilder from '@sanity/image-url'
// import {
//     PRIVATE_SANITY_PROJECT_ID,
//     PRIVATE_SANITY_DATASET
//   } from "$env/static/private";
// import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

// const builder = imageUrlBuilder({
//     projectId: PRIVATE_SANITY_PROJECT_ID,
//     dataset: PRIVATE_SANITY_DATASET,
// })

// export function urlFor(source: SanityImageSource) {
//   return builder.image(source)
// }

export function formatDateToChile(date: string) {
	const options = { year: 'numeric', month: 'long', day: 'numeric' };
	return new Intl.DateTimeFormat('es-CL', options).format(new Date(date));
}

// Function to format the price to CLP
export function formatPriceToCLP(price: number): string {
	return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
}
