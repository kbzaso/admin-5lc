import { type VariantProps, tv } from "tailwind-variants";
export { default as Badge } from "./badge.svelte";

export const badgeVariants = tv({
	base: "inline-flex select-none items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
	variants: {
		variant: {
			default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
			secondary:
				"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
			destructive:
				"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
			outline: "text-foreground",
			// Status variants: light fill + 900 text keeps ≥4.5:1 in light and dark themes.
			success: "border-transparent bg-green-300 text-green-950",
			warning: "border-transparent bg-orange-300 text-orange-950",
			info: "border-transparent bg-blue-300 text-blue-950",
			accent: "border-transparent bg-cyan-300 text-cyan-950",
			neutral: "border-transparent bg-gray-300 text-gray-950",
			danger: "border-transparent bg-red-300 text-red-950",
			// Muted outlined counterparts for secondary info (counts, codes, types).
			"outline-success": "border-green-500/60 text-green-700 dark:text-green-300",
			"outline-warning": "border-orange-500/60 text-orange-700 dark:text-orange-300",
			"outline-info": "border-blue-500/60 text-blue-700 dark:text-blue-300",
			"outline-danger": "border-red-500/60 text-red-700 dark:text-red-300",
		},
		size: {
			sm: "px-2 py-0 text-[11px]",
			md: "px-2.5 py-0.5 text-xs",
			lg: "px-3 py-1 text-sm",
		},
		// Leading dot so state isn't conveyed by colour alone.
		dot: {
			true: "gap-1.5 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current",
			false: "",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "md",
		dot: false,
	},
});

export type Variant = VariantProps<typeof badgeVariants>["variant"];
export type Size = VariantProps<typeof badgeVariants>["size"];
