import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

createRoot(document.getElementById("root")!).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
	// Use vite-plugin-pwa's virtual register in production
	import('virtual:pwa-register').then(({ registerSW }) => {
		registerSW({ immediate: true });
	}).catch(() => {
		// ignore during dev or if virtual module is missing
	});
}
