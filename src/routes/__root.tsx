import {
	createRootRoute,
	type ErrorComponentProps,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "#/components/Logo";
import { btn, Icon, Toaster } from "#/components/ui";

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
				title: "Lunaz Cashier",
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
		document.title = `${title} · Lunaz`;
	}, [title]);
	return (
		<main className="flex min-h-dvh flex-col p-6">
			<Link to="/" className="self-start">
				<Logo />
			</Link>
			<div className="rise m-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
				<h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
				<p className="text-kertas/70">{body}</p>
				<div className="mt-4 flex flex-wrap justify-center gap-3">
					{children}
				</div>
			</div>
		</main>
	);
}

function NotFound() {
	return (
		<Shell
			title="Page not found"
			body="This link doesn't lead anywhere. Check the address or head back."
		>
			<Link to="/" className={btn.lunas}>
				Open cashier
			</Link>
			<Link to="/store" className={btn.ghostDark}>
				Visit store
			</Link>
		</Shell>
	);
}

function Crash({ reset }: ErrorComponentProps) {
	return (
		<Shell
			title="Something went wrong"
			body="We couldn't load this page. Your payment, if any, is safe: invoices are tracked on the server."
		>
			<button
				type="button"
				onClick={() => {
					reset();
					location.reload();
				}}
				className={btn.lunas}
			>
				<Icon name="back" className="h-5 w-5 rotate-180" />
				Try again
			</button>
			<Link to="/" className={btn.ghostDark}>
				Open cashier
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
