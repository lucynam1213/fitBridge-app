// Trainer-curated home workout videos. Used when a client has no gym
// session logged today, or when the trainer specifically assigns a home
// workout for a non-gym day.

export const videoWorkouts = [
  {
    id: 'vw_full_body',
    youtubeId: 'UBMk30rjy0o',
    title: '20-Min Full Body HIIT (No Equipment)',
    duration: 20,
    category: 'HIIT',
    difficulty: 'Intermediate',
    trainerNote: 'Do this on days you can\'t make it to the gym. Keep heart rate above 140 bpm.',
    assignedBy: 'Coach Mike K.',
  },
  {
    id: 'vw_upper_body',
    youtubeId: '2pLT-olgUJs',
    title: 'Upper Body Strength (Dumbbells Only)',
    duration: 30,
    category: 'Strength',
    difficulty: 'Intermediate',
    trainerNote: 'Use the same load progression we discussed. Stop 1-2 reps before failure.',
    assignedBy: 'Coach Mike K.',
  },
  {
    id: 'vw_yoga_flow',
    youtubeId: 'v7AYKMP6rOE',
    title: 'Morning Yoga Flow — 15 min',
    duration: 15,
    category: 'Flexibility',
    difficulty: 'Beginner',
    trainerNote: 'Great for recovery days. Focus on breath, not depth.',
    assignedBy: 'Coach Mike K.',
  },
  {
    id: 'vw_core_express',
    youtubeId: 'AnYl6Nk9GOA',
    title: 'Core Express — 10-Min Abs',
    duration: 10,
    category: 'Core',
    difficulty: 'Beginner',
    trainerNote: 'Add this to the end of cardio sessions when you\'re short on time.',
    assignedBy: 'Coach Mike K.',
  },
  {
    id: 'vw_lower_body',
    youtubeId: 'aclHkVaku9U',
    title: 'Lower Body Bodyweight Burn',
    duration: 25,
    category: 'Strength',
    difficulty: 'Intermediate',
    trainerNote: 'Hit this on missed-gym days. Tempo matters — 3 seconds down, 1 up.',
    assignedBy: 'Coach Mike K.',
  },
];

export function getVideoWorkout(id) {
  return videoWorkouts.find((v) => v.id === id) || videoWorkouts[0];
}

// Pick the assigned home workout for the user (in real app this would be
// based on TrainerClientLink — for the prototype, default to the first one).
export function getAssignedHomeWorkout() {
  return videoWorkouts[0];
}
