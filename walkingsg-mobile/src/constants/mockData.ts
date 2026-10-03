/* ==========================================================================
   WalkingSG Mock Data & Domain Models
   Strict adherence to FE_RULES.md
   ========================================================================== */

/* Section Mock Data */
export interface RouteModel {
  id: string;
  name: string;
  matchPct: number;
  time: string;
  distance: string;
  shadePct: number;
  stairs: number;
  crowd: string;
  details: string[];
}

export interface FeedPostModel {
  id: number;
  iconType: 'bad' | 'warn' | 'good';
  iconGlyph: 'lift' | 'water' | 'shelter' | 'escalator' | 'hazard';
  title: string;
  timeAgo: string;
  desc: string;
}

export const INITIAL_ROUTES: RouteModel[] = [
  {
    id: 'route-a',
    name: 'Route A — via PCN',
    matchPct: 94,
    time: '23 min',
    distance: '1.8 km',
    shadePct: 85,
    stairs: 0,
    crowd: 'Low crowd',
    details: [
      '85% tree-shaded or sheltered — coolest at midday.',
      'Step-free the whole way; one gentle ramp by the canal.',
      'Quiet park-connector route, away from the crowds.',
      'Paved, ~2 m wide — fine for wheelchairs and scooters.',
    ],
  },
  {
    id: 'route-b',
    name: 'Route B — Orchard Rd',
    matchPct: 78,
    time: '19 min',
    distance: '1.5 km',
    shadePct: 40,
    stairs: 4,
    crowd: 'Med crowd',
    details: [
      'Moderate commercial shelter with covered walkways.',
      '4 stairs at subway pedestrian underpass.',
      'Higher pedestrian traffic along retail corridor.',
    ],
  },
  {
    id: 'route-c',
    name: 'Route C — Bencoolen St',
    matchPct: 71,
    time: '21 min',
    distance: '1.6 km',
    shadePct: 55,
    stairs: 2,
    crowd: 'Low crowd',
    details: [
      'Tree-lined street with 55% canopy coverage.',
      '2 kerb-cut ramps and 2 stairs near arts university.',
      'Even sidewalks with gentle gradient.',
    ],
  },
  {
    id: 'route-d',
    name: 'Route D — Direct',
    matchPct: 52,
    time: '16 min',
    distance: '1.3 km',
    shadePct: 10,
    stairs: 8,
    crowd: 'High crowd',
    details: [
      'Fastest direct line but exposed to midday sun.',
      '8 stairs across pedestrian footbridge.',
      'Not recommended for wheelchair or heat-sensitive walkers.',
    ],
  },
  {
    id: 'route-e',
    name: 'Route E — Wide / Quiet',
    matchPct: 88,
    time: '25 min',
    distance: '2.0 km',
    shadePct: 70,
    stairs: 0,
    crowd: 'Low crowd',
    details: [
      'Wide paved walkways with low bicycle and foot traffic.',
      'Completely step-free path with smooth tarmac.',
      '70% shaded by rain trees along residential canal.',
    ],
  },
];

export const INITIAL_FEED_POSTS: FeedPostModel[] = [
  {
    id: 1,
    iconType: 'bad',
    iconGlyph: 'lift',
    title: 'Lift out of service',
    timeAgo: '12 min ago',
    desc: 'Bedok MRT Exit B lift down — avoid if using a wheelchair or scooter.',
  },
  {
    id: 2,
    iconType: 'warn',
    iconGlyph: 'water',
    title: 'Ponding reported',
    timeAgo: '48 min ago',
    desc: 'Standing water along the PCN near Tampines Ave 10 after the rain.',
  },
  {
    id: 3,
    iconType: 'good',
    iconGlyph: 'shelter',
    title: 'New sheltered path added',
    timeAgo: 'Yesterday',
    desc: 'A sheltered walkway now connects Somerset MRT to Orchard Central.',
  },
  {
    id: 4,
    iconType: 'warn',
    iconGlyph: 'escalator',
    title: 'Escalator maintenance',
    timeAgo: '2 days ago',
    desc: 'Novena MRT Exit A escalator under maintenance until Friday.',
  },
];
/* End Section Mock Data */
