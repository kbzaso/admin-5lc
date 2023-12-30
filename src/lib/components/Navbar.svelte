<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";

  function logout() {
		fetch('/api/auth', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		}).then((res) => {
			if (res.ok) {
				invalidateAll();
				goto('/');
			}
		});
	}
</script>

<div class="navbar bg-base-100">
	<div class="flex-1 justify-between">
		<a href="/eventos" class="btn btn-ghost text-xl">
			<img
				src="https://cdn.sanity.io/images/izngoptr/production/ee38bb721de0e7b08cae68dcfe5b641c9449881c-71x40.svg?fit=max&auto=format"
				alt="Logo 5LC"
			/></a
		>
	</div>
	<div class="navbar-end">
		<button on:click={logout} class="btn">Logout</button>
	</div>
</div>
