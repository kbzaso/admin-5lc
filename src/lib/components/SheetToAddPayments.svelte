<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import * as Sheet from '$lib/components/ui/sheet';
	import { mediaQuery } from 'svelte-legos';
	import { ClipboardPenLine } from 'lucide-svelte';
	const isDesktop = mediaQuery('(min-width: 768px)');
	let open = false;

	function pasteFormData() {
		navigator.clipboard.readText().then((text) => {
			const data = JSON.parse(text);
			const form = document.getElementById('addPayment');
			if (form) {
				Object.keys(data).forEach((key) => {
					const input = form.querySelector(`[name="${key}"]`);
					if (input) {
						input.value = data[key];
					}
				});
			}
		});
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Trigger asChild let:builder>
		<Button class="w-full md:w-40 fixed left-0 bottom-0 md:relative" builders={[builder]}
			>Agregar pago</Button
		>
	</Sheet.Trigger>
	<Sheet.Content side={$isDesktop ? 'right' : 'bottom'}>
		<Sheet.Header >
			<Sheet.Title class="flex gap-4 items-center mb-2">
				Agregar pago
				{#if $page.data.user.admin}
					<Button variant="ghost" on:click={pasteFormData}>
						<ClipboardPenLine class="text-primary" />
					</Button>
				{/if}
			</Sheet.Title>
			<!-- <Sheet.Description>
		  Make changes to your profile here. Click save when you're done.
		</Sheet.Description> -->
		</Sheet.Header>
		<form
			id="addPayment"
			class="grid items-start gap-4"
			method="POST"
			action="?/addPayment"
			use:enhance
			on:submit={() => (open = false)}
		>
			<div class="flex gap-4">
				<div class="grid gap-2 w-full">
					<Label for="name">Nombres</Label>
					<Input class="text-lg" type="text" id="name" name="name" placeholder="Pablito" required />
				</div>
				<div class="grid gap-2 w-full">
					<Label for="rut">RUT</Label>
					<Input class="text-lg" type="text" id="rut" name="rut" placeholder="1111111-0" required />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="grid gap-2 w-full">
					<Label for="email">Email</Label>
					<Input class="text-lg"  type="email" id="email" name="email" placeholder="pablito@5lc.cl" required />
				</div>
				<div class="grid gap-2 w-full">
					<Label for="phone">Teléfono</Label>
					<Input class="text-lg" id="phone" name="phone" type="text" placeholder="+56991291468" required />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="grid gap-2 w-full">
					<Label for="ticketAmount">Entradas</Label>
					<Input class="text-lg" type="number" name="ticketAmount" min="0" max="10" id="ticketAmount" required />
				</div>
				<div class="grid gap-2 w-full">
					<Label for="price">Precio</Label>
					<Input class="text-lg" type="number" name="price" min="0" id="price" required />
				</div>
			</div>
			{#if $page.data.eventFromSanityStudio?.sell_type === 'ubication'}
			<fieldset>
				<legend>Entrada:</legend>
				<div class="flex gap-4">
					<label class="label cursor-pointer flex flex-col">
						<input
							type="radio"
							id="general_tickets"
							name="ticketType"
							class="radio checked:bg-primary text-lg"
							checked="checked"
							value="general_tickets"
						/>
						<span class="label-text mt-2">General</span>
					</label>
					<label class="label cursor-pointer flex flex-col">
						<input
							type="radio"
							name="ticketType"
							id="ringside_tickets"
							class="radio checked:bg-primary text-lg"
							value="ringside_tickets"
						/>
						<span class="label-text mt-2">Ringisde</span>
					</label>
				</div>
			</fieldset>
			{/if}
			<Button type="submit">Crear pago</Button>
		</form>
		<!-- <Sheet.Footer>
		<Sheet.Close asChild let:builder>
		  <Button builders={[builder]} type="submit">Save changes</Button>
		</Sheet.Close>
	  </Sheet.Footer> -->
	</Sheet.Content>
</Sheet.Root>
