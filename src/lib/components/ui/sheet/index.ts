import { Dialog as SheetPrimitive } from "bits-ui";
import { type VariantProps, tv } from "tailwind-variants";
import { cubicInOut, quartOut } from "svelte/easing";

import Portal from "./sheet-portal.svelte";
import Overlay from "./sheet-overlay.svelte";
import Content from "./sheet-content.svelte";
import Header from "./sheet-header.svelte";
import Footer from "./sheet-footer.svelte";
import Title from "./sheet-title.svelte";
import Description from "./sheet-description.svelte";

const Root = SheetPrimitive.Root;
const Close = SheetPrimitive.Close;
const Trigger = SheetPrimitive.Trigger;

export {
	Root,
	Close,
	Trigger,
	Portal,
	Overlay,
	Content,
	Header,
	Footer,
	Title,
	Description,
	//
	Root as Sheet,
	Close as SheetClose,
	Trigger as SheetTrigger,
	Portal as SheetPortal,
	Overlay as SheetOverlay,
	Content as SheetContent,
	Header as SheetHeader,
	Footer as SheetFooter,
	Title as SheetTitle,
	Description as SheetDescription,
};

export const sheetVariants = tv({
	base: "bg-background fixed z-50 gap-4 p-6 shadow-lg will-change-transform",
	variants: {
		side: {
			top: "inset-x-0 top-0 border-b border-base-content/10",
			bottom: "inset-x-0 bottom-0 border-t border-base-content/10",
			left: "inset-y-0 left-0 h-full w-3/4 border-r border-base-content/10 sm:max-w-sm",
			right: "inset-y-0 right-0 h-full w-3/4  border-l border-base-content/10 sm:max-w-sm",
		},
	},
	defaultVariants: {
		side: "right",
	},
});

// Quartic ease-out on enter (fast start, soft landing). Exit uses ease-in-out:
// a pure ease-in ends at full speed, which on a tall bottom sheet means
// 120px+ jumps per frame in the last frames and reads as a stutter. Both skip the animation for
// people who ask for reduced motion.
const reduced = () =>
	typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const offscreen = {
	top: { y: "-100%" },
	bottom: { y: "100%" },
	left: { x: "-100%" },
	right: { x: "100%" },
} as const;

export const sheetTransitions = Object.fromEntries(
	(Object.keys(offscreen) as (keyof typeof offscreen)[]).map((side) => [
		side,
		{
			in: { ...offscreen[side], opacity: 1, duration: reduced() ? 0 : 380, easing: quartOut },
			out: { ...offscreen[side], opacity: 1, duration: reduced() ? 0 : 280, easing: cubicInOut },
		},
	])
) as Record<
	keyof typeof offscreen,
	Record<"in" | "out", { x?: string; y?: string; opacity: number; duration: number; easing: (t: number) => number }>
>;

export type Side = VariantProps<typeof sheetVariants>["side"];
