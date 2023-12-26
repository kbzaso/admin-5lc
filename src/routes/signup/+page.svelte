<script lang="ts">
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms/client';
	export let data: PageData;

	const { form, enhance, errors, delayed, message } = superForm(data.form);
</script>

<div class="h-full grow grid place-items-center">
	<form method="post" use:enhance class="space-y-4 w-full max-w-md">
		<h1 class="text-xl text-secondary">Crea tu cuenta de usuario</h1>
		<label for="username" class="form-control w-full max-w-md">
			<div class="label">
				<span class="label-text">Email <span class="text-secondary">*</span></span>
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
		{#if $errors.username}<span class="invalid text-primary flex gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><path
						fill="currentColor"
						d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16m0 2C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1-6h2v2h-2zm0-10h2v8h-2z"
					/></svg
				>
				{$errors.username}</span
			>{/if}

		<label for="name" class="form-control w-full max-w-md">
			<div class="label">
				<span class="label-text">Nombre <span class="text-secondary">*</span></span>
			</div>
			<input
				bind:value={$form.name}
				name="name"
				id="name"
				type="text"
				placeholder="Tito el Bambino..."
				class="input input-bordered w-full max-w-md"
			/>
		</label>
		{#if $errors.name}<span class="invalid text-primary flex gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><path
						fill="currentColor"
						d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16m0 2C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1-6h2v2h-2zm0-10h2v8h-2z"
					/></svg
				>
				{$errors.name}</span
			>{/if}

		<label for="password" class="form-control w-full max-w-md">
			<div class="label">
				<span class="label-text">Contraseña <span class="text-secondary">*</span></span>
			</div>
			<input
				bind:value={$form.password}
				name="password"
				id="password"
				type="password"
				placeholder="******"
				class="input input-bordered max-w-md"
			/>
		</label>
		{#if $errors.password}<span class="invalid text-primary flex gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><path
						fill="currentColor"
						d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16m0 2C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1-6h2v2h-2zm0-10h2v8h-2z"
					/></svg
				>
				{$errors.password}</span
			>{/if}

		<label for="question" class="form-control w-full max-w-md">
			<div class="label">
				<span class="label-text"
					>¿Cual es origen del universo? <span class="text-secondary">*</span></span
				>
			</div>
			<input
				bind:value={$form.question}
				name="question"
				id="question"
				type="text"
				placeholder="..."
				class="input input-bordered max-w-md"
			/>
		</label>

		{#if $errors.question}<span class="invalid text-primary flex gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><path
						fill="currentColor"
						d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16m0 2C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1-6h2v2h-2zm0-10h2v8h-2z"
					/></svg
				>
				{$errors.question}</span
			>{/if}
		{#if $message}<span class="invalid text-warning flex gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><g fill="none" fill-rule="evenodd"
						><path
							d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"
						/><path
							fill="currentColor"
							d="m12 14.122l5.303 5.303a1.5 1.5 0 0 0 2.122-2.122L14.12 12l5.304-5.303a1.5 1.5 0 1 0-2.122-2.121L12 9.879L6.697 4.576a1.5 1.5 0 1 0-2.122 2.12L9.88 12l-5.304 5.304a1.5 1.5 0 1 0 2.122 2.12z"
						/></g
					></svg
				>
				{$message}</span
			>{/if}
		<div class="text-center">
			<button type="submit" class="btn btn-primary w-full max-w-md mb-2">
				{#if $delayed}
					<span class="loading loading-spinner loading-xs" />{/if}
				Entrar
			</button>
			<a href="/login" class="text-info underline">Ingresar</a>
		</div>
	</form>
</div>
