// src/lib/stores/validatorStore.ts
import { writable } from 'svelte/store';

export const idUpdateDialogOpen = writable({
    open: false,
    id: ''
});