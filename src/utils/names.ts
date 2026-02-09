const adjectives = [
    "Brave", "Swift", "Silent", "Crimson", "Azure", "Golden", "Mighty", 
    "Fierce", "Noble", "Shadow", "Stellar", "Cosmic", "Solar", "Lunar"
];

const nouns = [
    "Falcon", "Hawk", "Wolf", "Tiger", "Dragon", "Phoenix", "Titan", 
    "Ranger", "Pilot", "Captain", "Voyager", "Seeker", "Hunter", "Ghost"
];

export function generateGuestName(): string {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 900) + 100; // 100-999
    return `${adj}-${noun}-${num}`;
}
