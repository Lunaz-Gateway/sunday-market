import { createFileRoute, redirect } from "@tanstack/react-router";

// The cashier was retired; old links land on the marketplace.
export const Route = createFileRoute("/pos")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
});
