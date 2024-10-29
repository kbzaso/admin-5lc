<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { setContext } from 'svelte';
	import { CreditCard, Mail, Phone, User, Plus, Minus } from 'lucide-svelte';
	import { idUpdateDialogOpen } from '$lib/stores/idUpdatePaymentsDialogOpen';
	import { Progress } from './ui/progress';

	setContext('idUpdateDialogOpen', idUpdateDialogOpen);

	function closeDialog(paymentId?: string) {
		idUpdateDialogOpen.set({
			open: false,
			id: ''
		});
	}

	export let dialogOpen: boolean = false;
	export let payment;

	let validatedTickets = payment.ticketValidated;
</script>

<Dialog.Root bind:open={dialogOpen} onOpenChange={() => closeDialog()}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>
				{#if $page.data.validator}
					Validar entradas
				{:else}
					Actualizar pago
				{/if}
			</Dialog.Title>
		</Dialog.Header>
		{#if $page.data.validator}
			<div class="space-y-2">
				<div class="flex items-center space-x-2">
					<User class="h-4 w-4 text-muted-foreground" />
					<span>{payment.customer_name}</span>
				</div>
				<div class="flex items-center space-x-2">
					<CreditCard class="h-4 w-4 text-muted-foreground" />
					<span>{payment.rut}</span>
				</div>
				<div class="flex items-center space-x-2">
					<Mail class="h-4 w-4 text-muted-foreground" />
					<span>{payment.customer_email}</span>
				</div>
				<div class="flex items-center space-x-2">
					<Phone class="h-4 w-4 text-muted-foreground" />
					<span>{payment.customer_phone}</span>
				</div>
				<div class="flex justify-between items-center pt-4">
					<span>Entradas totales:</span>
					<span class="font-bold">{payment.ticketAmount}</span>
				</div>
				<div class="flex justify-between items-center">
					<span>Entradas validadas:</span>
					<span class="font-bold">{payment.ticketValidated}</span>
				</div>
				<Progress value={validatedTickets} max={payment.ticketAmount} class="w-full" />
				<form method="POST" action="?/validateTickets" use:enhance>
					<div class="w-full flex justify-between pt-4 items-center">
						<Button
							on:click={() => (validatedTickets -= 1)}
							disabled={validatedTickets === 0}
							variant="outline"
							class="p-6"
						>
							<Minus class="h-6 w-6" />
						</Button>
						<input type="text" name="ticketValidated" hidden value={validatedTickets} />
						<input type="text" name="paymentId" hidden value={payment.id} />
						<span class="text-4xl font-bold">{validatedTickets}</span>
						<Button
							variant="outline"
							on:click={() => (validatedTickets += 1)}
							disabled={validatedTickets === payment.ticketAmount}
							class="p-6"
						>
							<Plus className="h-6 w-6" />
						</Button>
					</div>
					<Button class="w-full mt-4" on:click={() => closeDialog()} type="submit">Validar</Button>
				</form>
			</div>
		{:else}
			<form class="grid items-start gap-4" method="POST" action="?/updatePayment" use:enhance>
				<div class="flex gap-4">
					<div class="grid gap-2 w-full">
						<Label for="name">Nombres</Label>
						<Input
							type="text"
							id="name"
							name="name"
							placeholder="Pablito"
							required
							disabled={$page.data.validator}
							value={payment.customer_name}
						/>
					</div>
					<div class="grid gap-2 w-full">
						<Label for="rut">RUT</Label>
						<Input
							type="text"
							id="rut"
							name="rut"
							placeholder="1111111-0"
							required
							disabled={$page.data.validator}
							value={payment.rut}
						/>
					</div>
				</div>
				<div class="flex gap-4">
					<div class="grid gap-2 w-full">
						<Label for="email">Email</Label>
						<Input
							type="email"
							id="email"
							name="email"
							placeholder="pablito@5lc.cl"
							required
							disabled={$page.data.validator}
							value={payment.customer_email}
						/>
					</div>
					<div class="grid gap-2 w-full">
						<Label for="phone">Teléfono</Label>
						<Input
							id="phone"
							name="phone"
							type="text"
							placeholder="+56991291468"
							required
							disabled={$page.data.validator}
							value={payment.customer_phone}
						/>
					</div>
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
							disabled={$page.data.validator}
							value={payment.ticketAmount}
						/>
					</div>
					<div class="grid gap-2 w-full">
						<Label for="price">Precio</Label>
						<Input
							type="number"
							name="price"
							min="0"
							id="price"
							disabled={$page.data.validator}
							required
							value={payment.price}
						/>
					</div>
				</div>
				{#if $page.data.eventFromSanityStudio.sell_type === 'ubication'}
					<div class="flex gap-4">
						<label class="label cursor-pointer flex flex-col">
							<input
								type="radio"
								name="ticketType"
								class="radio checked:bg-primary"
								checked={payment.ticketsType === 'general_tickets' ? 'checked' : ''}
								value="general_tickets"
							/>
							<span class="label-text mt-2">General</span>
						</label>

						<label class="label cursor-pointer flex flex-col">
							<input
								type="radio"
								name="ticketType"
								class="radio checked:bg-primary"
								value="ringside_tickets"
								checked={payment.ticketsType === 'ringside_tickets' ? 'checked' : ''}
							/>
							<span class="label-text mt-2">Ringisde</span>
						</label>
					</div>
				{/if}
				<Button on:click={() => closeDialog()} type="submit">Actualizar</Button>
			</form>
		{/if}
		{#if !$page.data.validator}
			<form method="POST" action="?/deletePayment" use:enhance class="w-full">
				<input type="text" hidden value={payment.id} name="paymentId" />
				<Button
					class="w-full bg-error hover:bg-red-500"
					on:click={() => closeDialog()}
					type="submit">Eliminar pago</Button
				>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
