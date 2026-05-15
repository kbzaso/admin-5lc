<script lang="ts">
	export let searchValue = '';
	export let placeholder = 'Buscador...';
	export let ariaLabel: string = placeholder;
</script>

<div class="flex flex-col md:flex-row md:items-center py-4 gap-4 justify-between">
	<div class="flex flex-col md:flex-row md:items-center gap-4 w-full">
		<input
			type="text"
			{placeholder}
			aria-label={ariaLabel}
			class="input input-md w-full md:w-96"
			bind:value={searchValue}
		/>
		<slot name="filters" />
	</div>
	<slot name="actions" />
</div>
