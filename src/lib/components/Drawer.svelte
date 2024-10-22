<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import * as RadioGroup from '$lib/components/ui/radio-group';

	console.log($page.data.eventFromSanityStudio.sell_type);

	let open = false;
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger asChild let:builder>
		<Button class="mx-4" builders={[builder]}>Agregar pago</Button>
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Agregar pago</Dialog.Title>
		</Dialog.Header>
		<form class="grid items-start gap-4" method="POST" action="?/addPayment" use:enhance>
			<div class="grid gap-2">
				<Label for="name">Nombres</Label>
				<Input type="text" id="name" name="name" placeholder="Pablito" required />
			</div>
			<div class="grid gap-2">
				<Label for="rut">RUT</Label>
				<Input type="text" id="rut" name="rut" placeholder="1111111-0" required />
			</div>
			<div class="grid gap-2">
				<Label for="email">Email</Label>
				<Input type="email" id="email" name="email" placeholder="pablito@5lc.cl" required />
			</div>
			<div class="grid gap-2">
				<Label for="phone">Teléfono</Label>
				<Input id="phone" name="phone" type="text" placeholder="+56991291468" required />
			</div>
			<div class="flex gap-4">
				<div class="grid gap-2 w-full">
					<Label for="ticketAmount">Entradas</Label>
					<Input type="number" name="ticketAmount" min="0" max="10" id="ticketAmount" required />
				</div>
				<div class="grid gap-2 w-full">
					<Label for="price">Precio</Label>
					<Input type="number" name="price" min="0" id="price" required />
				</div>
			</div>
			{#if $page.data.eventFromSanityStudio.sell_type === 'ubication'}
				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text">General</span>
						<input
							type="radio"
							name="ticketType"
							class="radio checked:bg-primary"
							checked="checked"
							value="general_tickets"
						/>
					</label>
				</div>
				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text">Ringisde</span>
						<input
							type="radio"
							name="ticketType"
							class="radio checked:bg-primary"
							value="ringside_tickets"
						/>
					</label>
				</div>
			{/if}
			<Button
				on:click={() => {
					open = false;
				}}
				type="submit">Save changes</Button
			>
		</form>
	</Dialog.Content>
</Dialog.Root>
