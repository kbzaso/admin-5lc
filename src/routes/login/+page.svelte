<script lang="ts">
	import { SignIn, useClerkContext } from 'svelte-clerk';

	const ctx = useClerkContext();

	$effect(() => {
		if (ctx.isLoaded && ctx.auth.userId) {
			window.location.href = '/eventos';
		}
	});
</script>

<div class="h-full grow grid place-items-center">
	<SignIn forceRedirectUrl="/eventos" />
</div>
