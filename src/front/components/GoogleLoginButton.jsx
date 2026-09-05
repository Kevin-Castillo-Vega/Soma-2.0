import { useEffect, useRef } from "react";
import PropTypes from "prop-types";

export const GoogleLoginButton = ({ onSuccess, onError, text = "continue_with", disabled = false }) => {
	const buttonRef = useRef(null);

	useEffect(() => {
		const clientId = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID;
		if (!clientId) {
			console.warn("VITE_GOOGLE_AUTH_CLIENT_ID no está configurado en el archivo .env.");
			return;
		}

		const renderGoogleButton = () => {
			if (!window.google?.accounts?.id || !buttonRef.current) return;

			window.google.accounts.id.initialize({
				client_id: clientId,
				callback: (response) => {
					if (response?.credential) {
						onSuccess(response.credential);
					} else if (onError) {
						onError("No se recibió credencial de autenticación de Google.");
					}
				}
			});

			buttonRef.current.innerHTML = "";
			window.google.accounts.id.renderButton(buttonRef.current, {
				type: "standard",
				theme: "outline",
				size: "large",
				text: text, // "signin_with" | "continue_with" | "signup_with"
				shape: "pill",
				width: 320,
				logo_alignment: "left"
			});
		};

		if (window.google?.accounts?.id) {
			renderGoogleButton();
		} else {
			// En caso de que el script aún no termine de cargar
			const interval = setInterval(() => {
				if (window.google?.accounts?.id) {
					clearInterval(interval);
					renderGoogleButton();
				}
			}, 100);
			return () => clearInterval(interval);
		}
	}, [onSuccess, onError, text]);

	return (
		<div className={`flex w-full justify-center ${disabled ? "pointer-events-none opacity-50" : ""}`}>
			<div ref={buttonRef} className="flex justify-center" />
		</div>
	);
};

GoogleLoginButton.propTypes = {
	onSuccess: PropTypes.func.isRequired,
	onError: PropTypes.func,
	text: PropTypes.string,
	disabled: PropTypes.bool
};
