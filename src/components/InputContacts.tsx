import React, { useState } from "react";
import { api } from "../services/api";
import type { Client } from "../services/api";

type ContactRaw = Record<string, string>;

export default function CSVImportContacts(): JSX.Element {
  const [count, setCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);

  function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let curRow: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const nxt = text[i + 1];
      if (inQuotes) {
        if (ch === '"') {
          if (nxt === '"') {
            cur += '"';
            i++;
          } else inQuotes = false;
        } else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          curRow.push(cur);
          cur = "";
        } else if (ch === "\r") {
        } else if (ch === "\n") {
          curRow.push(cur);
          rows.push(curRow);
          curRow = [];
          cur = "";
        } else cur += ch;
      }
    }
    if (cur !== "" || curRow.length > 0) {
      curRow.push(cur);
      rows.push(curRow);
    }
    return rows;
  }

  function rowsToObjects(rows: string[][]): ContactRaw[] {
    if (!rows.length) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((row) => {
      const obj: ContactRaw = {};
      for (let i = 0; i < headers.length; i++)
        obj[headers[i] || `col${i}`] = (row[i] || "").trim();
      return obj;
    });
  }

  function normalizePhone(raw: string | undefined): string {
    if (!raw) return "";
    const cleaned = raw.trim().replace(/[^+\d]/g, "");
    if (!cleaned) return "";
    return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
  }

  function isPhoneLike(s?: string): boolean {
    if (!s) return false;
    // Se tiver >=7 dígitos e pouca letra => é telefone
    const digits = (s.match(/\d/g) || []).length;
    const letters = (s.match(/[A-Za-zÀ-ú]/g) || []).length;
    return digits >= 7 && digits > letters;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCount(null);
    setErrors(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const objects = rowsToObjects(rows);

      const clients = objects.map((o) => {
        const fullName = [o["First Name"], o["Middle Name"], o["Last Name"]]
          .filter(Boolean)
          .join(" ")
          .trim();
        const phones = [o["Phone 1 - Value"], o["Phone 2 - Value"], o["Phone"]]
          .map(normalizePhone)
          .filter(Boolean);
        const cpfRaw = (o["CPF"] || o["cpf"] || "").trim();
        const birthdayRaw = (o["Birthday"] || o["anniversary"] || "").trim();

        let nameCandidate = fullName || o["File As"] || o["Name"] || "";
        if (isPhoneLike(nameCandidate)) nameCandidate = ""; // evita nome que é só telefone
        const name = nameCandidate || "(sem nome)";

        const payload: any = {
          name,
          telephone: phones[0] || "",
          address: o["Address"] || o["address"] || "",
        };

        if (cpfRaw !== "") payload.cpf = cpfRaw;
        if (birthdayRaw !== "") {
          const d = new Date(birthdayRaw);
          if (!isNaN(d.getTime())) payload.anniversary = d.toISOString();
        }

        return payload as Omit<Client, "_id">;
      });

      const validClients = clients.filter((c) => c.name && c.telephone);
      if (!validClients.length) {
        setErrors(["Nenhum contato válido (falta name ou telephone)."]);
        setCount(0);
        (e.target as HTMLInputElement).value = "";
        return;
      }

      const first15 = validClients.slice(0, 15);
      const results = await Promise.allSettled(
        first15.map((c) => api.createClient(c))
      );

      const errorList: string[] = [];
      let successCount = 0;
      results.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          if (r.value.error) {
            errorList.push(`Linha ${idx + 1}: ${r.value.error}`);
            console.error(
              "Erro ao salvar cliente:",
              r.value.error,
              first15[idx]
            );
          } else {
            successCount++;
            console.log("Cliente salvo:", r.value.data);
          }
        } else {
          errorList.push(`Linha ${idx + 1}: ${String(r.reason)}`);
          console.error("Fetch falhou:", r.reason, first15[idx]);
        }
      });

      setCount(successCount);
      if (errorList.length) setErrors(errorList);
      (e.target as HTMLInputElement).value = "";
    } catch (err) {
      console.error("Erro ao processar arquivo:", err);
      setErrors([err instanceof Error ? err.message : String(err)]);
      (e.target as HTMLInputElement).value = "";
    }
  }

  return (
    <div className="p-4">
      <label style={{ display: "block", marginBottom: 8 }}>
        Importar CSV de contatos
      </label>
      <input accept=".csv, text/csv" type="file" onChange={handleFile} />
      {count !== null && (
        <div style={{ marginTop: 8 }}>
          {count} contatos importados com sucesso.
        </div>
      )}
      {errors && (
        <div style={{ marginTop: 8, color: "crimson" }}>
          <strong>Erros:</strong>
          <ul>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
