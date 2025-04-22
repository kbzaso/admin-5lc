<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/stores';
</script>

<div class="w-full">
	<div class="flex py-6 justify-between">
		<a href="/eventos" class="btn btn-ghost text-xl">
			<img
				src="https://cdn.sanity.io/images/izngoptr/production/ee38bb721de0e7b08cae68dcfe5b641c9449881c-71x40.svg?fit=max&auto=format"
				alt="Logo 5LC"
			/></a
		>
		<div class="flex gap-4">
			{#if $page.data.user.id}
				<a href="/eventos" class="btn btn-soft">Entradas</a>
				<a href="/merch" class="btn btn-soft">Merch</a>
			{/if}

			<SignedIn>
				<UserButton afterSignOutUrl="/" />
			</SignedIn>
			<SignedOut>
				<!-- <a href="/login">Sign in</a> <span>|</span> <a href="/sign-up">Sign up</a> -->
				No estas logeado
				<!-- You could also use <SignInButton mode="modal" /> and <SignUpButton mode="modal" /> here -->
			</SignedOut>
		</div>
	</div>
</div>
