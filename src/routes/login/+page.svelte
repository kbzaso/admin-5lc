<!-- routes/login/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<div class="h-full grow grid place-items-center">
	<form method="post" use:enhance class="space-y-4 w-full max-w-md">
		<label for="username" class="form-control w-full max-w-md">
			<div class="label">
				<span class="label-text">Email de usuario</span>
			</div>
			<input
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
				name="password"
				id="password"
				type="password"
				placeholder="Chupapija2020..."
				class="input input-bordered max-w-md"
			/>
		</label>

		<button type="submit" class="btn btn-primary w-full max-w-md">Entrar</button>
	</form>
</div>
