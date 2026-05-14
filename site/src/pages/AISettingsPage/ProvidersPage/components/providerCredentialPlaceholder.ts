/** Blank or server-masked credential (ellipsis), not a new secret to save. */
export function isCredentialPlaceholder(value: string): boolean {
	const t = value.trim();
	return t === "" || t.includes("...");
}
