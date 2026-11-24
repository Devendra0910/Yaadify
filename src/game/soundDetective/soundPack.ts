export const SOUND_PACK = [
  { id: "doorbell", label: "Doorbell", icon: "🔔", group: "Home", family: "ring", familiar: true },
  { id: "keys", label: "Keys", icon: "🔑", group: "Home", family: "metal", familiar: true },
  { id: "pour", label: "Water pouring", icon: "🚰", group: "Home", family: "water", familiar: true },
  { id: "utensils", label: "Utensils", icon: "🍴", group: "Home", family: "metal", familiar: false },
  { id: "cooker", label: "Pressure cooker", icon: "🍲", group: "Home", family: "air", familiar: false },
  { id: "knock", label: "Door knock", icon: "🚪", group: "Home", family: "impact", familiar: true },
  { id: "unlock", label: "Door unlocking", icon: "🔓", group: "Home", family: "metal", familiar: false },
  { id: "rain", label: "Rain", icon: "🌧️", group: "Nature", family: "water", familiar: true },
  { id: "birds", label: "Birdsong", icon: "🐦", group: "Nature", family: "voice", familiar: true },
  { id: "wind", label: "Wind", icon: "🌬️", group: "Nature", family: "air", familiar: false },
  { id: "thunder", label: "Thunder", icon: "⛈️", group: "Nature", family: "rumble", familiar: true },
  { id: "dog", label: "Dog barking", icon: "🐕", group: "Animals", family: "voice", familiar: true },
  { id: "cat", label: "Cat meowing", icon: "🐈", group: "Animals", family: "voice", familiar: true },
  { id: "cow", label: "Cow mooing", icon: "🐄", group: "Animals", family: "voice", familiar: false },
  { id: "bicycle", label: "Bicycle bell", icon: "🚲", group: "Transport", family: "ring", familiar: true },
  { id: "horn", label: "Car horn", icon: "🚗", group: "Transport", family: "ring", familiar: true },
  { id: "train", label: "Train", icon: "🚆", group: "Transport", family: "rumble", familiar: false },
  { id: "rickshaw", label: "Auto-rickshaw", icon: "🛺", group: "Transport", family: "rumble", familiar: false },
  { id: "clap", label: "Applause", icon: "👏", group: "Everyday", family: "impact", familiar: true },
  { id: "steps", label: "Footsteps", icon: "👣", group: "Everyday", family: "impact", familiar: true },
  { id: "clock", label: "Clock ticking", icon: "🕰️", group: "Everyday", family: "impact", familiar: true },
  { id: "coins", label: "Coins", icon: "🪙", group: "Everyday", family: "metal", familiar: false },
  { id: "alarm", label: "Alarm clock", icon: "⏰", group: "Everyday", family: "ring", familiar: true },
] as const;

export type SoundId = typeof SOUND_PACK[number]["id"];
export type Sound = typeof SOUND_PACK[number];

export function soundById(id: SoundId): Sound {
  const sound = SOUND_PACK.find((entry) => entry.id === id);
  if (!sound) throw new Error(`Unknown sound: ${id}`);
  return sound;
}
