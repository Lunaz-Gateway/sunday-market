import { createFileRoute, redirect } from "@tanstack/react-router";

// The single-shop demo store grew into the marketplace.
export const Route = createFileRoute("/store")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
});
