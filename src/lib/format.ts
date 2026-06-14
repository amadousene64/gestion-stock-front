const FR = new Intl.NumberFormat('fr-FR');

export function formatFCFA(amount: number): string {
  return `${FR.format(amount)} FCFA`;
}
