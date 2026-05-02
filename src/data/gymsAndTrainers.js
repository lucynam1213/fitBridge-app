// Fake gym + trainer catalog used by the client onboarding "find a
// trainer" flow. In a real product this would come from a geo-indexed
// backend; for the prototype we ship a hand-authored list with sensible
// fake distances so the UI feels real.
//
// IMPORTANT: do NOT import from `mockData.js` to avoid coupling the
// connection-flow content to the demo seed data. Coach Mike (usr_002)
// is duplicated here intentionally so he appears as a selectable
// trainer at the first gym — that lets the demo flow end with a
// trainer the user can actually message.

export const NEARBY_GYMS = [
  {
    id: 'gym_001',
    name: 'Pulse Strength Club',
    address: '12 Bedford Ave',
    distanceMi: 0.4,
    rating: 4.8,
    image: '🏋️',
    perks: ['24/7 access', 'Free weights', 'Personal training'],
  },
  {
    id: 'gym_002',
    name: 'Brooklyn Iron Yard',
    address: '234 N 6th St',
    distanceMi: 0.8,
    rating: 4.6,
    image: '💪',
    perks: ['Olympic lifting', 'Group classes', 'Locker rooms'],
  },
  {
    id: 'gym_003',
    name: 'Kinetic Studio',
    address: '511 Court St',
    distanceMi: 1.2,
    rating: 4.9,
    image: '🧘',
    perks: ['Yoga + mobility', 'Boutique', 'Online + in-person'],
  },
  {
    id: 'gym_004',
    name: 'Heights Athletic',
    address: '92 Henry St',
    distanceMi: 2.1,
    rating: 4.5,
    image: '🏃',
    perks: ['Running club', 'CrossFit', 'Cardio-focused'],
  },
];

export const TRAINERS_BY_GYM = {
  gym_001: [
    {
      id: 'usr_002',  // matches the seed Coach Mike so messaging keeps working
      name: 'Coach Mike K.',
      avatar: 'MK',
      specialty: 'Strength + body recomp',
      rating: 4.9,
      yearsExperience: 8,
      pricePerSession: 90,
      bio: 'Pragmatic strength work for busy professionals. NASM-CPT, CSCS.',
    },
    {
      id: 'tr_pulse_002',
      name: 'Coach Sarah Lin',
      avatar: 'SL',
      specialty: 'Olympic lifting',
      rating: 4.8,
      yearsExperience: 6,
      pricePerSession: 110,
      bio: 'Former competitive weightlifter. USAW Level 2, focuses on technique.',
    },
    {
      id: 'tr_pulse_003',
      name: 'Coach Devon Reid',
      avatar: 'DR',
      specialty: 'Endurance training',
      rating: 4.7,
      yearsExperience: 4,
      pricePerSession: 80,
      bio: 'Marathon-prep specialist. RRCA Level 1. Great for first-time racers.',
    },
  ],
  gym_002: [
    {
      id: 'tr_iron_001',
      name: 'Coach Marcus Thorne',
      avatar: 'MT',
      specialty: 'Powerlifting',
      rating: 4.9,
      yearsExperience: 11,
      pricePerSession: 120,
      bio: 'Geared toward serious strength athletes. Coached 3 state record holders.',
    },
    {
      id: 'tr_iron_002',
      name: 'Coach Priya Anand',
      avatar: 'PA',
      specialty: 'Body recomp + nutrition',
      rating: 4.8,
      yearsExperience: 7,
      pricePerSession: 95,
      bio: 'Precision Nutrition L2. Combines lifting + sustainable eating habits.',
    },
  ],
  gym_003: [
    {
      id: 'tr_kin_001',
      name: 'Coach Yuki Tanaka',
      avatar: 'YT',
      specialty: 'Yoga + mobility',
      rating: 4.9,
      yearsExperience: 9,
      pricePerSession: 100,
      bio: 'E-RYT 500. Low-impact strength + mobility for desk workers and athletes.',
    },
    {
      id: 'tr_kin_002',
      name: 'Coach James Whitfield',
      avatar: 'JW',
      specialty: 'Pilates + rehab',
      rating: 4.7,
      yearsExperience: 5,
      pricePerSession: 105,
      bio: 'NCPT-certified. Specializes in post-injury programming.',
    },
  ],
  gym_004: [
    {
      id: 'tr_heights_001',
      name: 'Coach Riley O\'Connor',
      avatar: 'RO',
      specialty: 'CrossFit',
      rating: 4.6,
      yearsExperience: 6,
      pricePerSession: 85,
      bio: 'CF-L3 trainer. Programs for people stepping into CrossFit for the first time.',
    },
  ],
};

export function findGym(gymId) {
  return NEARBY_GYMS.find((g) => g.id === gymId) || null;
}

export function findTrainer(gymId, trainerId) {
  return (TRAINERS_BY_GYM[gymId] || []).find((t) => t.id === trainerId) || null;
}
