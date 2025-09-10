export async function handleCode(code, subjectId) {
  if (typeof code !== 'string' || !/^[0-9]+$/.test(code)) return null;
  const res = await fetch(`/tutor/${subjectId}/metadata.json`);
  if (!res.ok) return null;
  const meta = await res.json();
  return meta.quickCodes ? meta.quickCodes[code] || null : null;
}
