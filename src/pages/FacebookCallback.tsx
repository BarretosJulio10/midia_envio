import { useEffect, useState } from "react";

export default function FacebookCallback() {
  const [msg, setMsg] = useState("Conectando com o Facebook...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error_description") ?? params.get("error");
    const payload = code
      ? { source: "fb-oauth", code, state }
      : { source: "fb-oauth", error: error ?? "Autorizacao cancelada" };

    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
      setMsg(code ? "Conectado! Pode fechar esta janela." : `Falhou: ${payload.error}`);
      setTimeout(() => window.close(), 800);
    } else {
      // Fallback: sem popup, volta para o painel guardando o code
      if (code) {
        sessionStorage.setItem("fb_oauth_code", code);
        sessionStorage.setItem("fb_oauth_returned_state", state ?? "");
      }
      window.location.replace("/");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">{msg}</p>
    </div>
  );
}
