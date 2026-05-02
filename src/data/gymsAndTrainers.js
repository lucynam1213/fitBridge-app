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
//
// Each gym has a `lat`/`lng` pair so we can compute a real distance
// when the browser Geolocation API hands us the user's actual position.
// The static `distanceMi` is the fallback used when geolocation is
// denied / unavailable. Coordinates are real-ish points in Brooklyn so
// the relative spacing between pins still looks correct on a map view.

export const NEARBY_GYMS = [
  {
    id: 'gym_001',
    name: 'Pulse Strength Club',
    address: '12 Bedford Ave',
    lat: 40.7191, lng: -73.9573,
    distanceMi: 0.4,
    rating: 4.8,
    image: '🏋️',
    perks: ['24/7 access', 'Free weights', 'Personal training'],
  },
  {
    id: 'gym_002',
    name: 'Brooklyn Iron Yard',
    address: '234 N 6th St',
    lat: 40.7174, lng: -73.9606,
    distanceMi: 0.8,
    rating: 4.6,
    image: '💪',
    perks: ['Olympic lifting', 'Group classes', 'Locker rooms'],
  },
  {
    id: 'gym_003',
    name: 'Kinetic Studio',
    address: '511 Court St',
    lat: 40.6794, lng: -73.9990,
    distanceMi: 1.2,
    rating: 4.9,
    image: '🧘',
    perks: ['Yoga + mobility', 'Boutique', 'Online + in-person'],
  },
  {
    id: 'gym_004',
    name: 'Heights Athletic',
    address: '92 Henry St',
    lat: 40.6961, lng: -73.9953,
    distanceMi: 2.1,
    rating: 4.5,
    image: '🏃',
    perks: ['Running club', 'CrossFit', 'Cardio-focused'],
  },
];

// Haversine distance in miles between two lat/lng points. Used to compute
// "real" distances when the Geolocation API gives us the user's position;
// stays prototype-friendly (no external deps).
export function distanceMilesBetween(a, b) {
  if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

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

// "Floating" trainer roster used for gyms that aren't in the seed data
// (i.e. real Places API results). The brief says trainer cards stay fake
// for now, so this gives every searched gym a sensible roster the user
// can choose from. Each entry has a unique id so connection requests
// don't collide between gyms.
export const FALLBACK_TRAINERS = [
  {
    id: 'tr_demo_001',
    name: 'Coach Aria Chen',
    avatar: 'AC',
    specialty: 'General fitness',
    rating: 4.8,
    yearsExperience: 6,
    pricePerSession: 95,
    bio: 'Available 6am–8pm weekdays. Programs strength, cardio, and mobility for clients getting back into routine.',
  },
  {
    id: 'tr_demo_002',
    name: 'Coach Devon Reid',
    avatar: 'DR',
    specialty: 'Endurance training',
    rating: 4.7,
    yearsExperience: 4,
    pricePerSession: 80,
    bio: 'RRCA Level 1. Marathon-prep specialist. Available evenings + weekends.',
  },
  {
    id: 'tr_demo_003',
    name: 'Coach Priya Anand',
    avatar: 'PA',
    specialty: 'Body recomp + nutrition',
    rating: 4.8,
    yearsExperience: 7,
    pricePerSession: 95,
    bio: 'Precision Nutrition L2. Combines lifting + sustainable eating habits. Mid-day availability.',
  },
];

export function findGym(gymId) {
  return NEARBY_GYMS.find((g) => g.id === gymId) || null;
}

// When the gym id matches a seed entry (gym_001..gym_004) we return its
// curated trainer list. For Places-API gyms (id prefixed with `place_`)
// or unknown ids we return the generic fallback roster — the gym is
// real but the trainers are still synthetic per the prototype brief.
export function trainersForGym(gymId) {
  if (TRAINERS_BY_GYM[gymId]) return TRAINERS_BY_GYM[gymId];
  return FALLBACK_TRAINERS;
}

export function findTrainer(gymId, trainerId) {
  return trainersForGym(gymId).find((t) => t.id === trainerId) || null;
}

// ---- Selected-gym persistence ---------------------------------------------
// FindGym → FindTrainer carries the selection through both the URL
// (`/connect/gym/:gymId/trainers`) AND a sessionStorage record so the
// trainer page can recover the gym name/address even when the id isn't
// in the seed list (i.e. came from Places API). One central pair of
// helpers so both pages stay in sync.

const SELECTED_GYM_KEY = 'fitbridge_selected_gym';

export function rememberSelectedGym(gym) {
  if (!gym?.id) return;
  try {
    sessionStorage.setItem(SELECTED_GYM_KEY, JSON.stringify({
      id: gym.id,
      name: gym.name,
      address: gym.address || '',
      lat: gym.lat,
      lng: gym.lng,
      source: gym.source || 'seed',
    }));
  } catch { /* private mode / quota — fail soft */ }
}

export function recallSelectedGym(gymId) {
  try {
    const raw = sessionStorage.getItem(SELECTED_GYM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id === gymId ? parsed : null;
  } catch { return null; }
}
