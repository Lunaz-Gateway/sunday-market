import {
	createRootRoute,
	type ErrorComponentProps,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { MarketShell, mbtn } from "#/components/Market";
import { Icon, Toaster } from "#/components/ui";
import { MARKET } from "#/lib/catalog";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: MARKET,
			},
			{ name: "theme-color", content: "#1C1F3D" },
		],
		links: [
			{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: NotFound,
	errorComponent: Crash,
});

function Shell({
	title,
	body,
	children,
}: {
	title: string;
	body: string;
	children: React.ReactNode;
}) {
	useEffect(() => {
		document.title = `${title} · ${MARKET}`;
	}, [title]);
	return (
		<MarketShell>
			<div className="rise mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center sm:py-20">
				<span className="grid h-14 w-14 place-items-center rounded-full bg-stone-100">
					<Icon name="alert" className="h-7 w-7 text-stone-500" />
				</span>
				<h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
				<p className="text-stone-600">{body}</p>
				<div className="mt-3 flex flex-wrap justify-center gap-3">
					{children}
				</div>
			</div>
		</MarketShell>
	);
}

function NotFound() {
	return (
		<Shell
			title="Page not found"
			body="This page doesn't exist or has moved. Your cart is still saved."
		>
			<Link to="/" className={mbtn.primary}>
				Continue shopping
			</Link>
			<Link to="/cart" className={mbtn.outline}>
				View cart
			</Link>
		</Shell>
	);
}

function Crash({ reset }: ErrorComponentProps) {
	return (
		<Shell
			title="Something went wrong"
			body="We couldn't load this page. If you already paid, the payment is safe: orders are tracked on the payment server."
		>
			<button
				type="button"
				onClick={() => {
					reset();
					location.reload();
				}}
				className={mbtn.primary}
			>
				Try again
			</button>
			<Link to="/" className={mbtn.outline}>
				Continue shopping
			</Link>
		</Shell>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Toaster />
				<Scripts />
			</body>
		</html>
	);
}
