<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { setContext } from 'svelte';

	import { idUpdateDialogOpen } from '$lib/stores/idUpdatePaymentsDialogOpen';

	setContext('idUpdateDialogOpen', idUpdateDialogOpen);

	function closeDialog(paymentId?: string) {
		idUpdateDialogOpen.set({
			open: false,
			id: ''
		});
	}

	export let dialogOpen: boolean = false;
	export let payment;
</script>

<Dialog.Root bind:open={dialogOpen} onOpenChange={() => closeDialog()}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Agregar pago</Dialog.Title>
		</Dialog.Header>
		<form class="grid items-start gap-4" method="POST" action="?/updatePayment" use:enhance>
			<div class="grid gap-2">
				<Label for="name">Nombres</Label>
				<Input
					type="text"
					id="name"
					name="name"
					placeholder="Pablito"
					required
					value={payment.customer_name}
				/>
			</div>
			<div class="grid gap-2">
				<Label for="rut">RUT</Label>
				<Input
					type="text"
					id="rut"
					name="rut"
					placeholder="1111111-0"
					required
					value={payment.rut}
				/>
			</div>
			<div class="grid gap-2">
				<Label for="email">Email</Label>
				<Input
					type="email"
					id="email"
					name="email"
					placeholder="pablito@5lc.cl"
					required
					value={payment.customer_email}
				/>
			</div>
			<div class="grid gap-2">
				<Label for="phone">Teléfono</Label>
				<Input
					id="phone"
					name="phone"
					type="text"
					placeholder="+56991291468"
					required
					value={payment.customer_phone}
				/>
			</div>
			<input type="text" hidden value={payment.id} name="paymentId" />
			<div class="flex gap-4">
				<div class="grid gap-2 w-full">
					<Label for="ticketAmount">Entradas</Label>
					<Input
						type="number"
						name="ticketAmount"
						min="0"
						max="10"
						id="ticketAmount"
						required
						value={payment.ticketAmount}
					/>
				</div>
				<div class="grid gap-2 w-full">
					<Label for="price">Precio</Label>
					<Input type="number" name="price" min="0" id="price" required value={payment.price} />
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
							checked={payment.ticketsType === 'general_tickets' ? 'checked' : ''}
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
							checked={payment.ticketsType === 'ringside_tickets' ? 'checked' : ''}
						/>
					</label>
				</div>
			{/if}
			<Button on:click={() => closeDialog()} type="submit">Save changes</Button>
		</form>
		<form method="POST" action="?/deletePayment" use:enhance class="w-full">
			<input type="text" hidden value={payment.id} name="paymentId" />
			<Button class="w-full bg-error hover:bg-red-500" on:click={() => closeDialog()} type="submit">Eliminar pago</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
