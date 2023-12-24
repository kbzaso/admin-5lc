<!-- routes/login/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms/client';
	export let data: PageData;

	const { form, enhance, errors, delayed } = superForm(data.form);
</script>

<div class="h-full grow grid place-items-center">
	<form method="post" use:enhance class="space-y-4 w-full max-w-md">
		<label for="username" class="form-control w-full max-w-md">
			<div class="label">
				<span class="label-text">Email de usuario</span>
			</div>
			<input
				bind:value={$form.username}
				name="username"
				id="username"
				type="email"
				placeholder="bovedin@gmai..."
				class="input input-bordered w-full max-w-md"
			/>
		</label>
		<label for="password" class="form-control w-full max-w-md">
			<div class="label">
				<span class="label-text">Contraseña</span>
			</div>
			<input
				bind:value={$form.password}
				name="password"
				id="password"
				type="password"
				placeholder="Chupapija2020..."
				class="input input-bordered max-w-md"
			/>
		</label>

		{#if $errors.username}<span class="invalid text-primary flex gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><path
						fill="currentColor"
						d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16m0 2C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1-6h2v2h-2zm0-10h2v8h-2z"
					/></svg
				>
				{$errors.username}</span
			>{/if}
		<button type="submit" class="btn btn-primary w-full max-w-md">
			{#if $delayed}
				<span class="loading loading-spinner loading-xs" />{/if}
			Entrar
		</button>
	</form>
</div>
