<script lang="ts">
	import { type Variant, type Size, badgeVariants } from "./index.js";
	import { cn } from "$lib/utils.js";

	let className: string | undefined | null = undefined;
	export let href: string | undefined = undefined;
	export let variant: Variant = "default";
	export let size: Size = "md";
	export let dot = false;
	export { className as class };
</script>

<svelte:element
	this={href ? "a" : "span"}
	{href}
	class={cn(badgeVariants({ variant, size, dot, className }))}
	{...$$restProps}
>
	<slot />
</svelte:element>
