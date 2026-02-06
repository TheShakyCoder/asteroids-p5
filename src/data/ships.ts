export const ships = [
  {
    id: "interceptor",
    name: "Interceptor",
    class: "Small",
    description: "Fast and agile. Ideal for hit-and-run tactics.",
    stats: { speed: 8, armor: 20, hull: 100, weaponRadius: 2 },
    weapons: [
        {
            weapon: {
              name: "Light Plasma Rifle",
              damage: 10,
              fireRate: 10,
              fieldOfView: 45,
              range: 800
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
    stats: { speed: 5, armor: 40, hull: 200, weaponRadius: 5 },
    weapons: [
        {
            weapon: {
              name: "Medium Plasma Rifle",
              damage: 20,
              fireRate: 4,
              fieldOfView: 45,
              range: 1000
            },
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
    stats: { speed: 3, armor: 60, hull: 400, weaponRadius: 10 },
    weapons: [
        {
            weapon: {
              name: "Heavy Plasma Rifle",
              damage: 30,
              fireRate: 2,
              fieldOfView: 45,
              range: 1200
            },
            mount: {
                left: 25,
                front: 0,
                rotation: -90,
            }
        }
    ]
  }
];
