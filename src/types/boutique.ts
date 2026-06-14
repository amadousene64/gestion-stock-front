export interface Boutique {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
}

export type BoutiqueDto = {
  name: string;
  address: string | null;
};
