<!-- routes/login/+page.svelte -->
<script lang="ts">
	import SignIn from 'clerk-sveltekit/client/SignIn.svelte'
</script>

<div class="h-full grow grid place-items-center">
	<SignIn redirectUrl="/eventos" />
</div>
