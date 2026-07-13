import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
	// Use vite-plugin-pwa's virtual register in production
	import('virtual:pwa-register').then(({ registerSW }) => {
		registerSW({ immediate: true });
	}).catch(() => {
		// ignore during dev or if virtual module is missing
	});
}
