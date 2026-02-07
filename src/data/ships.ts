export const ships = [
  {
    id: "interceptor",
    name: "Interceptor",
    class: "Small",
    description: "Fast and agile. Ideal for hit-and-run tactics.",
    stats: {
      speed: 8,
      armor: 20,
      hull: 100,
      weaponRadius: 2,
      angularVelocity: 60,
      acceleration: 0.2,
      maxVelocity: 15,
      lateralDamping: 0.15
    },
    weapons: [
      {
        weapon: {
          id: 'mec-a6-fang',
          level: 1
        },
        mount: {
          left: 5,
          front: 5,
          rotation: 0,
        }
      }
    ]
  },
{
  id: "assault",
    name: "Assault",
      class: "Medium",
        description: "Well-rounded combat vessel with balanced protection and firepower.",
          stats: { speed: 5, armor: 40, hull: 200, weaponRadius: 5, angularVelocity: 30, acceleration: 0.3, maxVelocity: 7, lateralDamping: 0.08 },
  weapons: [
    {
      weapon: 'medium-plasma-rifle',
      mount: {
        left: 15,
        front: 15,
        rotation: 0,
      }
    }
  ]
},
{
  id: "support",
    name: "Support",
      class: "Large",
        description: "Heavy armor and sustained fire. Built to hold the line.",
          stats: { speed: 3, armor: 60, hull: 400, weaponRadius: 10, angularVelocity: 15, acceleration: 0.2, maxVelocity: 4, lateralDamping: 0.04 },
  weapons: [
    {
      weapon: 'heavy-plasma-rifle',
      mount: {
        left: 25,
        front: 0,
        rotation: -90,
      }
    }
  ]
}
];
