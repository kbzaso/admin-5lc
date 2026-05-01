<script lang="ts">
	import { useClerkContext } from 'svelte-clerk';
	import { invalidateAll } from '$app/navigation';

	const ctx = useClerkContext();
	let prevUserId: string | null | undefined;
	let primed = false;

	$effect(() => {
		if (!ctx.isLoaded) return;
		const userId = ctx.auth.userId;
		if (!primed) {
			primed = true;
			prevUserId = userId;
			invalidateAll();
			return;
		}
		if (userId !== prevUserId) {
			prevUserId = userId;
			invalidateAll();
		}
	});
</script>
