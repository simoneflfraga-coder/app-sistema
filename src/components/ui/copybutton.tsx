import { useState } from "react";

interface CopyButtonProps {
  text: string; // texto a ser copiado
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // Volta ao normal depois de 2s
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  return (
    <button onClick={handleCopy}>{copied ? "Copiado ✅" : "Copiar"}</button>
  );
}
