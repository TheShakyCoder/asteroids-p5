export const factions = [
  {
    id: "humans",
    name: "Terran Union",
    description: "Adaptable and resilient survivors from Earth. Balanced ship stats.",
    color: "#4facfe",
    pickable: true,
    hasStation: true,
    spawn: { x: -2000, y: -2000 }
  },
  {
    id: "martians",
    name: "Martian Sovereignty",
    description: "Advanced technological society from the Red Planet. Higher speed and maneuverability.",
    color: "#ff3b30",
    pickable: true,
    hasStation: true,
    spawn: { x: 2000, y: 2000 }
  },
  {
    id: "ancients",
    name: "Ancient Ones",
    description: "Old technological society.",
    color: "#fff830ff",
    pickable: false,
    hasStation: false,
    spawn: { x: 0, y: 0 }
  }
];
