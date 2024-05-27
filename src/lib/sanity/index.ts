import { createClient } from '@sanity/client';

export const sanity = createClient({
    projectId:import.meta.env. VITE_SANITY_PROJECT_ID,
    dataset: import.meta.env.VITE_SANITY_DATASET,
    useCdn: false, // `false` if you want to ensure fresh data
    apiVersion: '2024-05-26'
});

import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const builder = imageUrlBuilder({
    projectId:import.meta.env. VITE_SANITY_PROJECT_ID,
    dataset: import.meta.env.VITE_SANITY_DATASET,
})

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}