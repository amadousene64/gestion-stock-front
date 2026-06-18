import {
  HomeIcon, CaisseIcon, ProduitsIcon, ClientsIcon, StockIcon,
  BoutiquesIcon, EmployesIcon, DepensesIcon, FacturesIcon, VentesIcon, StatsIcon,
} from '../components/ui/icons';
import type { ComponentType } from 'react';

export interface NavItem {
  path: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

export const COMMON_ITEMS: NavItem[] = [
  { path: '/',          label: 'Accueil',   Icon: HomeIcon,      end: true },
  { path: '/caisse',    label: 'Caisse',    Icon: CaisseIcon },
  { path: '/ventes',    label: 'Ventes',    Icon: VentesIcon },
  { path: '/produits',  label: 'Produits',  Icon: ProduitsIcon },
  { path: '/clients',   label: 'Clients',   Icon: ClientsIcon },
  { path: '/stock',     label: 'Stock',     Icon: StockIcon },
  { path: '/factures',  label: 'Factures',  Icon: FacturesIcon },
];

export const OWNER_ITEMS: NavItem[] = [
  { path: '/boutiques',    label: 'Boutiques',    Icon: BoutiquesIcon },
  { path: '/employes',     label: 'Employés',     Icon: EmployesIcon },
  { path: '/depenses',     label: 'Dépenses',     Icon: DepensesIcon },
  { path: '/statistiques', label: 'Statistiques', Icon: StatsIcon },
];
