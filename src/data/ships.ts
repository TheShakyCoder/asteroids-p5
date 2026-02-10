export const ships = [
  {
    id: "interceptor",
    name: "Interceptor",
    class: "Small",
    description: "Fast and agile. Ideal for hit-and-run tactics.",
    stats: {
      armor: 20,
      hull: 100,
      weaponRadius: 2,
      angularVelocity: 60,
      acceleration: 2,
      maxVelocity: 900,
      lateralDamping: 0.15
    },
    weapons: [
      {
        weapon: { id: 'mec-a6-fang', level: 1 },
        mount: { left: 20, front: -15, rotation: 0 }
      },
      {
        weapon: { id: 'swarm-missiles', level: 1 },
        mount: { left: 10, front: -10, rotation: 0 }
      },
      {
        weapon: { id: 'swarm-missiles', level: 1 },
        mount: { left: -10, front: -10, rotation: 0 }
      },
      {
        weapon: { id: 'mec-a6-fang', level: 1 },
        mount: { left: -20, front: -15, rotation: 0 }
      }
    ]
  },
  {
    id: "assault",
    name: "Assault",
    class: "Medium",
    description: "Well-rounded combat vessel with balanced protection and firepower.",
    stats: { armor: 40, hull: 200, weaponRadius: 5, angularVelocity: 30, acceleration: 2, maxVelocity: 420, lateralDamping: 0.08 },
    weapons: [
      {
        weapon: { id: 'mec-m10-viper', level: 1 },
        mount: { left: 35, front: -5, rotation: -90 }
      },
      {
        weapon: { id: 'mec-m10-viper', level: 1 },
        mount: { left: 35, front: 5, rotation: -45 }
      },
      {
        weapon: { id: 'mrm-s3-harrier', level: 1 },
        mount: { left: 15, front: 25, rotation: 0 }
      },
      {
        weapon: { id: 'mrm-s3-harrier', level: 1 },
        mount: { left: -15, front: 25, rotation: 0 }
      },
      {
        weapon: { id: 'mec-m10-viper', level: 1 },
        mount: { left: -35, front: 5, rotation: 45 }
      },
      {
        weapon: { id: 'mec-m10-viper', level: 1 },
        mount: { left: -35, front: -5, rotation: 90 }
      },
    ]
  },
  {
    id: "support",
    name: "Support",
    class: "Large",
    description: "Heavy armor and sustained fire. Built to hold the line.",
    stats: { armor: 60, hull: 400, weaponRadius: 10, angularVelocity: 15, acceleration: 2, maxVelocity: 240, lateralDamping: 0.04 },
    weapons: [
      {
        weapon: { id: 'hvm-x9-judgement', level: 1 },
        mount: { left: 25, front: -150, rotation: -90 }
      },
      {
        weapon: { id: 'hvm-x9-judgement', level: 1 },
        mount: { left: 25, front: -50, rotation: -90 }
      },
      {
        weapon: { id: 'mec-h25-titan', level: 1 },
        mount: { left: 25, front: 50, rotation: -90 }
      },
      {
        weapon: { id: 'mec-h25-titan', level: 1 },
        mount: { left: 25, front: 150, rotation: -80 }
      },
      {
        weapon: { id: 'mec-h25-titan', level: 1 },
        mount: { left: -25, front: 150, rotation: 80 }
      },
      {
        weapon: { id: 'mec-h25-titan', level: 1 },
        mount: { left: -25, front: 50, rotation: 90 }
      },
      {
        weapon: { id: 'hvm-x9-judgement', level: 1 },
        mount: { left: -25, front: -50, rotation: 90 }
      },
      {
        weapon: { id: 'hvm-x9-judgement', level: 1 },
        mount: { left: -25, front: -150, rotation: 90 }
      }
    ]
  }
];
