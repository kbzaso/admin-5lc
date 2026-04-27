<script lang="ts">
	import { SignIn } from 'svelte-clerk';
</script>

<div class="h-full grow grid place-items-center">
	<SignIn forceRedirectUrl="/eventos" />
</div>
