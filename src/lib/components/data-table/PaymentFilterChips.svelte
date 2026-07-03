<script lang="ts">
	import { page } from '$app/stores';
	import { chipClass } from '$lib';
	import {
		slicesFor,
		orderCategories,
		ensureCategoriesInitialized,
		selectedCategories,
		onlyUnvalidated,
		showRejected,
		STATUS_CATEGORIES
	} from '$lib/stores/paymentFilter';

	export let payments: any[];

	$: isUbication = $page.data.sell_type === 'ubication';

	// The validation filter only makes sense once the event has taken place.
	$: eventDate = $page.data.eventFromSanityStudio?.date;
	$: eventPassed = eventDate ? new Date(eventDate).getTime() < Date.now() : false;

	// Only offer chips for categories that actually appear in the data.
	$: present = (() => {
		const set = new Set<string>();
		for (const p of payments ?? []) {
			for (const s of slicesFor(p, isUbication)) set.add(s.category);
		}
		return set;
	})();
	$: categories = orderCategories(present, isUbication);
	$: saleChips = categories.filter((c) => !STATUS_CATEGORIES.includes(c));
	$: statusChips = categories.filter((c) => STATUS_CATEGORIES.includes(c));

	$: ensureCategoriesInitialized(categories);

	function toggle(category: string) {
		selectedCategories.update((s) => ({ ...s, [category]: !s[category] }));
	}
</script>

{#if categories.length > 0}
	<!-- While viewing the non-success (rejected/register) payments, the category
	     and validation filters don't apply, so they're disabled. -->
	<div class="flex flex-col gap-2 transition-opacity {$showRejected ? 'opacity-40' : ''}">
		{#if eventPassed}
			<div class="flex flex-wrap items-center gap-2">
				<span class="mr-1 text-xs text-base-content/50">Validación:</span>
				<button
					type="button"
					disabled={$showRejected}
					on:click={() => onlyUnvalidated.update((v) => !v)}
					class={chipClass($onlyUnvalidated)}
				>
					Sin validar
				</button>
			</div>
		{/if}
		{#if saleChips.length > 0}
			<div class="flex flex-wrap items-center gap-2">
				<span class="mr-1 text-xs text-base-content/50">Entradas:</span>
				{#each saleChips as category (category)}
					<button
						type="button"
						disabled={$showRejected}
						on:click={() => toggle(category)}
						class={chipClass($selectedCategories[category])}
					>
						{category}
					</button>
				{/each}
			</div>
		{/if}
		{#if statusChips.length > 0}
			<div class="flex flex-wrap items-center gap-2">
				<span class="mr-1 text-xs text-base-content/50">Estado:</span>
				{#each statusChips as category (category)}
					<button
						type="button"
						disabled={$showRejected}
						on:click={() => toggle(category)}
						class={chipClass($selectedCategories[category])}
					>
						{category}
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
