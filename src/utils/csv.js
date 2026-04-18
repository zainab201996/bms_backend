function parseSimpleCsv(csvContent) {
  if (!csvContent || !csvContent.trim()) {
    throw new Error("CSV content is required");
  }

  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include header and at least one data row");
  }

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || "";
    });
    return record;
  });

  return rows;
}

function rowHasCompanyNameAndEmail(row) {
  const name = (
    row.name ||
    row.company_name ||
    row.company ||
    row["company name"] ||
    ""
  ).trim();
  const email = (row.email || "").trim().toLowerCase();
  return Boolean(name && email);
}

/**
 * Alternate format: one field per line, e.g.
 *   name,Acme Inc
 *   email,acme@test.com
 *   address,123 Main St
 * Multiple companies: repeat name/email blocks (optionally separated by blank lines).
 */
function parseKeyValueCompanyCsv(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const nameKeys = new Set(["name", "company_name", "company", "company name"]);
  const records = [];
  let record = {};

  function flush() {
    if (rowHasCompanyNameAndEmail(record)) {
      records.push({ ...record });
    }
    record = {};
  }

  for (const line of lines) {
    const idx = line.indexOf(",");
    if (idx === -1) {
      continue;
    }
    const rawKey = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (nameKeys.has(rawKey)) {
      if (record.name && record.email) {
        flush();
      }
      record.name = value;
    } else if (rawKey === "email") {
      record.email = value.toLowerCase();
    } else if (rawKey === "address" || rawKey === "location") {
      record.address = value;
    }
  }
  flush();

  return records;
}

/**
 * Prefer normal header + data rows; if no row validates, try key-value lines.
 */
function parseCompanyCsvRows(csvContent) {
  const standardRows = parseSimpleCsv(csvContent);
  if (standardRows.some(rowHasCompanyNameAndEmail)) {
    return standardRows;
  }
  const kvRows = parseKeyValueCompanyCsv(csvContent);
  if (kvRows.some(rowHasCompanyNameAndEmail)) {
    return kvRows;
  }
  return standardRows;
}

module.exports = {
  parseSimpleCsv,
  parseCompanyCsvRows,
  parseKeyValueCompanyCsv
};
