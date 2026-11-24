// Export všetkých dát používateľa do súboru JSON (právo na prenosnosť údajov podľa GDPR).

// Obsah súboru: všetko, čo appka o používateľovi ukladá.
export function buildExport({ email, monthsData, savingsGoals, customCategories }, now = new Date()) {
  return {
    app: 'Finančná appka',
    exportedAt: now.toISOString(),
    email: email ?? null,
    monthsData,
    savingsGoals,
    customCategories,
  };
}

// financna-appka-data-2026-11-24.json (dátum podľa miestneho času)
export function exportFileName(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `financna-appka-data-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// Stiahne dáta ako súbor. Nič sa nikam neposiela, súbor vznikne priamo v prehliadači.
export function downloadJson(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
