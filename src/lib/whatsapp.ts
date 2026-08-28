/**
 * Formate un numéro de téléphone pour un lien wa.me : indicatif + numéro,
 * sans "+" ni espaces. Ajoute l'indicatif Sénégal (221) si absent.
 */
export function formatPhoneForWhatsapp(raw: string): string {
  let digits = raw.replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^00/, '');
  if (!digits.startsWith('221')) {
    digits = '221' + digits.replace(/^0+/, '');
  }
  return digits;
}

/**
 * Construit un lien wa.me. Si `phone` est renseigné, ouvre directement la
 * discussion avec ce contact ; sinon, lien générique laissant choisir le contact.
 */
export function buildWhatsappLink(phone: string | null | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  const trimmed = phone?.trim();
  if (!trimmed) return `https://wa.me/?text=${encoded}`;
  return `https://wa.me/${formatPhoneForWhatsapp(trimmed)}?text=${encoded}`;
}
