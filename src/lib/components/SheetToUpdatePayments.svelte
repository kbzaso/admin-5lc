<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { onMount, setContext } from 'svelte';
	import { CreditCard, Mail, Phone, User, Plus, Minus, CircleAlert, Copy } from 'lucide-svelte';
	import { idUpdateDialogOpen } from '$lib/stores/idUpdatePaymentsDialogOpen';
	import { Progress } from './ui/progress';
	import * as Alert from '$lib/components/ui/alert';
	import * as Sheet from '$lib/components/ui/sheet';
	import { mediaQuery } from 'svelte-legos';
	import { toast } from 'svelte-sonner';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { writable } from 'svelte/store';
	import id from 'date-fns/locale/id';

	setContext('idUpdateDialogOpen', idUpdateDialogOpen);

	const isDesktop = mediaQuery('(min-width: 768px)');

	export let dialogOpen: boolean = false;
	let confirmationDialogOpen: boolean = false;

	export let payment;
	
	let comments = writable(payment.Comment);

	let validatedTickets = payment.ticketValidated;

	const STATUS = {
		register: {
			code: 'register',
			title: 'Pago registrado',
			description: 'El pago se ha registrado, pero no se ha completado el proceso de pago.'
		},
		rejected: {
			code: 'rejected',
			title: 'Pago rechazado',
			description:
				'El pago ha sido rechazado por el banco. En el caso que se haya realizado el descuento en la cuenta del cliente, el banco hace el reembolso en unos minutos.'
		}
	};

	function closeDialog(paymentId?: string) {
		idUpdateDialogOpen.set({
			open: false,
			id: ''
		});
	}

	let copiedForm = '';

	function copyFormData() {
		const form = document.getElementById('updateForm');
		if (form) {
			const formData = new FormData(form as HTMLFormElement);
			const data: { [key: string]: FormDataEntryValue } = {};
			formData.forEach((value, key) => {
				if (key !== 'paymentId') {
					data[key] = value;
				}
			});
			navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
				toast.info(`Se copio la información del comprador/a`, {});
			});
		}
	}
</script>

<Sheet.Root bind:open={dialogOpen} onOpenChange={() => closeDialog()}>
	<Sheet.Content side={$isDesktop ? 'right' : 'bottom'}>
		<Sheet.Header>
			<Sheet.Title class="flex gap-4 items-center">
				{#if payment.payment_status === STATUS.register.code || payment.payment_status === STATUS.rejected.code}{:else if $page.data.validator}
					Validar entradas
				{:else}
					Actualizar pago
				{/if}
				{#if $page.data.admin}
					<Button variant="ghost" on:click={copyFormData}>
						<Copy class="text-primary" />
					</Button>
				{/if}
			</Sheet.Title>
			<Sheet.Description>
				{#if payment.payment_status === 'register'}
					<Alert.Root variant="destructive">
						<CircleAlert class="h-4 w-4" />
						<Alert.Title>{STATUS.register.title}</Alert.Title>
						<Alert.Description>{STATUS.register.description}</Alert.Description>
					</Alert.Root>
				{:else if payment.payment_status === 'rejected'}
					<Alert.Root variant="destructive">
						<CircleAlert class="h-4 w-4" />
						<Alert.Title>{STATUS.rejected.title}</Alert.Title>
						<Alert.Description>{STATUS.rejected.description}</Alert.Description>
					</Alert.Root>
				{:else}

					<Tabs.Root value={$page.data.validator ? 'validator' : 'general'} class="w-full">
						<Tabs.List class="w-full mb-4">
							{#if !$page.data.validator}
							<Tabs.Trigger class="w-full" value="general">General</Tabs.Trigger>
							{/if}
							<Tabs.Trigger class="w-full" value="validator">Validador</Tabs.Trigger>
							<Tabs.Trigger class="w-full" value="comments">Comentarios</Tabs.Trigger>
						</Tabs.List>
						{#if !$page.data.validator}
						<Tabs.Content value="general">
							<form
								id="updateForm"
								class="grid items-start gap-4"
								method="POST"
								action="?/updatePayment"
								use:enhance
							>
								<div class="flex gap-4">
									<div class="grid gap-2 w-full">
										<Label for="name" class="text-left">Nombres</Label>
										<Input
											type="text"
											id="name"
											name="name"
											class="text-lg"
											placeholder="Pablito"
											required
											disabled={$page.data.validator}
											value={payment.customer_name}
										/>
									</div>
									<div class="grid gap-2 w-full">
										<Label for="rut" class="text-left">RUT</Label>
										<Input
											type="text"
											id="rut"
											name="rut"
											class="text-lg"
											placeholder="1111111-0"
											required
											disabled={$page.data.validator}
											value={payment.rut}
										/>
									</div>
								</div>
								<div class="flex gap-4">
									<div class="grid gap-2 w-full">
										<Label for="email" class="text-left">Email</Label>
										<Input
											type="email"
											id="email"
											name="email"
											class="text-lg"
											placeholder="pablito@5lc.cl"
											required
											disabled={$page.data.validator}
											value={payment.customer_email}
										/>
									</div>
									<div class="grid gap-2 w-full">
										<Label for="phone" class="text-left">Teléfono</Label>
										<Input
											id="phone"
											name="phone"
											type="text"
											class="text-lg"
											placeholder="+56991291468"
											required
											disabled={$page.data.validator}
											value={payment.customer_phone}
										/>
									</div>
								</div>
								<input type="text" hidden value={payment.id} name="paymentId" id="paymentId" />
								<div class="flex gap-4">
									<div class="grid gap-2 w-full">
										<Label for="ticketAmount" class="text-left">Entradas</Label>
										<Input
											type="number"
											name="ticketAmount"
											min="0"
											max="10"
											class="text-lg"
											id="ticketAmount"
											required
											disabled={$page.data.validator}
											value={payment.ticketAmount}
										/>
									</div>
									<div class="grid gap-2 w-full">
										<Label for="price" class="text-left">Precio</Label>
										<Input
											type="number"
											name="price"
											min="0"
											class="text-lg"
											id="price"
											disabled={$page.data.validator}
											required
											value={payment.price}
										/>
									</div>
								</div>
								{#if $page.data.eventFromSanityStudio?.sell_type === 'ubication'}
									<div class="flex gap-4">
										<label class="label cursor-pointer flex flex-col">
											<input
												type="radio"
												name="ticketType"
												class="radio checked:bg-primary"
												checked={payment.ticketsType === 'General' ? 'checked' : ''}
												value="General"
											/>
											<span class="label-text mt-2">General</span>
										</label>

										<label class="label cursor-pointer flex flex-col">
											<input
												type="radio"
												name="ticketType"
												class="radio checked:bg-primary"
												value="Ringside"
												checked={payment.ticketsType === 'Ringside' ? 'checked' : ''}
											/>
											<span class="label-text mt-2">Ringisde</span>
										</label>
									</div>
								{/if}
								<div class="form-control">
									<label class="label cursor-pointer justify-start gap-4">
										<input
											name="refund"
											type="checkbox"
											checked={payment.refund}
											class="checkbox border-yellow-400 [--chkbg:theme(colors.yellow.400)] [--chkfg:black] checked:border-yellow-800"
										/>
										<span class="label-text text-white">Devolución</span>
									</label>
									<label class="label cursor-pointer justify-start gap-4">
										<input
											name="change"
											type="checkbox"
											checked={payment.changeEvent}
											class="checkbox border-yellow-400 [--chkbg:theme(colors.yellow.400)] [--chkfg:black] checked:border-yellow-800"
										/>
										<span class="label-text text-white">Cambio de evento</span>
									</label>
								</div>
								<div class="w-full flex gap-4">
									{#if !$page.data.validator}
										<Button
											class="w-full bg-error hover:bg-red-600 text-white"
											on:click={() => {
												closeDialog();
												confirmationDialogOpen = true;
											}}>Eliminar pago</Button
										>
									{/if}
									<Button
										class="w-full bg-primary hover:bg-primary-dark"
										on:click={() => {
											closeDialog();
										}}
										type="submit">Actualizar</Button
									>
								</div>
							</form>
						</Tabs.Content>
						{/if}
						<Tabs.Content value="validator">
							<div class="space-y-2 text-white">
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
										<span class="text-4xl text-primary font-bold">{validatedTickets}</span>
										<Button
											variant="outline"
											on:click={() => (validatedTickets += 1)}
											disabled={validatedTickets === payment.ticketAmount}
											class="p-6"
										>
											<Plus className="h-6 w-6" />
										</Button>
									</div>
									<Button class="w-full mt-4" on:click={() => closeDialog()} type="submit"
										>Validar</Button
									>
								</form>
							</div>
						</Tabs.Content>
						<Tabs.Content value="comments">
							<ScrollArea class="h-[200px] text-left rounded-md border bg-muted/20 p-4 mb-4">
								{#each $comments?.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) ?? [] as comment (comment.id)}
									<div class="flex flex-col gap-2 py-4 border-b border-muted" id={comment.id}>
										<span class="text-xs text-primary"
											>{new Date(comment.createdAt).toLocaleString('es-CL', {
												day: 'numeric',
												month: 'short',
												year: 'numeric',
												hour: 'numeric',
												minute: 'numeric'
											})}</span
										>
										<span class="text-sm">{comment?.commentText}</span>
									</div>
								{/each}
							</ScrollArea>

							<form
								id="updateForm"
								class="grid items-start gap-4"
								method="POST"
								action="?/addComment"
								use:enhance={() => {
									comments.update((current) => [
										{
											commentText: document.querySelector('textarea[name="comment"]')?.value || '',
											createdAt: new Date(),
											id: Math.random().toString(36).substring(7)
										},
										...current
									]);
									toast.success(`Se agrego un comentario`, {});
								}}
							>
								<Textarea required name="comment" class="text-[16px]" placeholder="Escribe tu comentario." />
								<input type="hidden" id="paymentId" value={payment.id} name="paymentId" />
								<Button class="w-full bg-primary hover:bg-primary-dark" type="submit"
									>Agregar comentario</Button
								>
							</form>
						</Tabs.Content>
					</Tabs.Root>
				{/if}
			</Sheet.Description>
		</Sheet.Header>
	</Sheet.Content>
</Sheet.Root>

<Dialog.Root bind:open={confirmationDialogOpen}>
	<Dialog.Content>
		<Dialog.Title class="leading-normal">
			¿Estás seguro de que deseas eliminar el pago de {payment.customer_name}?
		</Dialog.Title>
		<Dialog.Description>Una vez eliminado, no podrás recuperar la información.</Dialog.Description>
		<form
			method="POST"
			action="?/deletePayment"
			use:enhance
			class="w-full"
			on:submit={() => (confirmationDialogOpen = false)}
		>
			<input type="text" hidden value={payment.id} name="paymentId" />
			<Button class="w-full bg-error hover:bg-red-500" type="submit">Eliminar pago</Button>
		</form>
		<Dialog.Close />
	</Dialog.Content>
</Dialog.Root>
