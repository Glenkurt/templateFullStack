export interface BusinessNavItem {
  label: string;
  path: string;
  description: string;
}

export const BUSINESS_NAV_ITEMS: BusinessNavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    description: 'Point d entree du pilotage commercial et financier.'
  },
  {
    label: 'Clients',
    path: '/clients',
    description: 'Base de comptes, suivi de relation et prochaines actions.'
  },
  {
    label: 'Depenses',
    path: '/expenses',
    description: 'Pilotage des sorties de tresorerie et des categories de cout.'
  },
  {
    label: 'Revenus',
    path: '/revenues',
    description: 'Vue d ensemble des encaissements et revenus recurrent.'
  },
  {
    label: 'Campagnes',
    path: '/campaigns',
    description: 'Suivi des initiatives commerciales et de leur avancement.'
  }
];