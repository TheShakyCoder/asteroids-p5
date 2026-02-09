export const weapons = [
    {
        id: "mec-a6-fang",
        name: "MEC-A6 'Fang'/Type A 'Agressor' Light Autocannon",
        type: "Autocannon",
        class: "Light",
        fireDuration: 150,
        fireStroke: 2,

        minDamage: [1, 1.11, 1.22, 1.33, 1.44, 1.55, 1.66, 1.77, 1.88, 2],
        maxDamage: [10, 11.11, 12.22, 13.33, 14.44, 15.55, 16.67, 17.78, 18.89, 20],
        dps: [11, 12.22, 13.44, 14.67, 15.89, 17.11, 18.33, 19.56, 20.78, 22],
        armorPiercing: 5,
        minRange: 0,
        maxRange: 750,
        optimalRange: [300.00, 316.67, 333.34, 350.01, 366.68, 383.35, 400.02, 416.69, 433.39, 350],
        accuracy: 400.00,
        criticalOffense: 100,
        reload: 0.50,
        powerCost: 1.00,
        firingArc: 75.00,
        tylium: 10000
    },
    {
        id: "mec-b2-raptor",
        name: "MEC-B2 'Raptor' Medium Autocannon",
        type: "Autocannon",
        class: "Medium",
        fireDuration: 180,
        fireStroke: 3,

        minDamage: [2, 2.22, 2.44, 2.66, 2.88, 3.11, 3.33, 3.55, 3.77, 4],
        maxDamage: [18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
        dps: [20, 22, 24, 26, 28, 30, 32, 34, 36, 40],

        armorPiercing: 10,
        minRange: 0,
        maxRange: 900,
        optimalRange: [350, 370, 390, 410, 430, 450, 470, 490, 510, 530],

        accuracy: 420,
        criticalOffense: 110,
        reload: 0.6,
        powerCost: 1.4,
        firingArc: 75,
        tylium: 15000
    },
    {
        id: "mec-c4-phalanx",
        name: "MEC-C4 'Phalanx' Heavy Autocannon",
        type: "Autocannon",
        class: "Heavy",
        fireDuration: 220,
        fireStroke: 4,

        minDamage: [4, 4.44, 4.88, 5.33, 5.77, 6.22, 6.66, 7.11, 7.55, 8],
        maxDamage: [35, 38.88, 42.77, 46.66, 50.55, 54.44, 58.33, 62.22, 66.11, 70],
        dps: [38, 42, 46, 50, 54, 58, 62, 66, 70, 76],

        armorPiercing: 20,
        minRange: 0,
        maxRange: 950,
        optimalRange: [400, 420, 440, 460, 480, 500, 520, 540, 560, 580],

        accuracy: 380,
        criticalOffense: 130,
        reload: 0.75,
        powerCost: 2.2,
        firingArc: 70,
        tylium: 30000
    },

    //  MISSILES
    {
        id: "swarm-missiles",
        name: "Swarm Missile Rack",
        type: "Missile",
        class: "Light",
        fireDuration: 300,
        fireStroke: 1,

        minDamage: [10, 11.11, 12.22, 13.33, 14.44, 15.55, 16.66, 17.77, 18.88, 20],
        maxDamage: [80, 88, 96, 104, 112, 120, 128, 136, 144, 160],
        dps: [30, 33, 36, 39, 42, 45, 48, 51, 54, 60],

        armorPiercing: 12,
        minRange: 250,
        maxRange: 1300,
        optimalRange: [650, 680, 710, 740, 770, 800, 830, 860, 890, 920],

        accuracy: 300,
        criticalOffense: 120,

        // Projectile Physics
        projectileSpeed: 5,
        projectileMaxSpeed: 15,
        projectileAcceleration: 0.2,
        projectileAngularVelocity: 0.15,

        reload: 1.6,
        powerCost: 3.2,
        firingArc: 65,
        tylium: 50000
    },
    {
        id: "mrm-s3-harrier",
        name: "MRM-S3 \"Harrier\" Medium Missile Battery",
        type: "Missile",
        class: "Medium",
        fireDuration: 280,
        fireStroke: 1,

        minDamage: [14, 15.55, 17.11, 18.66, 20.22, 21.77, 23.33, 24.88, 26.44, 28],
        maxDamage: [85, 94.44, 103.88, 113.33, 122.77, 132.22, 141.66, 151.11, 160.55, 170],
        dps: [28, 31, 34, 37, 40, 43, 46, 49, 52, 56],

        armorPiercing: 14,

        minRange: 200,
        maxRange: 1300,
        optimalRange: [600, 630, 660, 690, 720, 750, 780, 810, 840, 870],

        accuracy: 320,
        criticalOffense: 115,

        // Projectile Physics
        projectileSpeed: 4,
        projectileMaxSpeed: 12,
        projectileAcceleration: 0.15,
        projectileAngularVelocity: 0.10,

        reload: 1.40,
        powerCost: 3.00,
        firingArc: 65.00,

        tylium: 52000
    },
    {
        id: "hvm-x9-judgement",
        name: "HVM-X9 \"Judgement\" Heavy Capital Missile Array",
        type: "Missile",
        class: "Heavy",
        fireDuration: 340,
        fireStroke: 1,

        minDamage: [30, 33.33, 36.66, 40, 43.33, 46.66, 50, 53.33, 56.66, 60],
        maxDamage: [160, 177.77, 195.55, 213.33, 231.11, 248.88, 266.66, 284.44, 302.22, 320],
        dps: [40, 44, 48, 52, 56, 60, 64, 68, 72, 80],

        armorPiercing: 28,

        minRange: 300,
        maxRange: 1600,
        optimalRange: [750, 780, 810, 840, 870, 900, 930, 960, 990, 1020],

        accuracy: 280,
        criticalOffense: 150,

        // Projectile Physics
        projectileSpeed: 3,
        projectileMaxSpeed: 10,
        projectileAcceleration: 0.1,
        projectileAngularVelocity: 0.05,

        reload: 2.10,
        powerCost: 4.80,
        firingArc: 60.00,

        tylium: 120000
    },

    // STATION WEAPONS
    {
        id: "sta-b1-sentinel",
        name: "STA-B1 'Sentinel' Station Defense Autocannon",
        type: "Autocannon",
        class: "Station",
        fireDuration: 250,
        fireStroke: 5,
        minDamage: 20,
        maxDamage: 40,
        armorPiercing: 30,
        minRange: 0,
        maxRange: 1800,
        optimalRange: 1200,
        accuracy: 600,
        reload: 6,
        firingArc: 360,
    },
    {
        id: "sta-m1-goliath",
        name: "STA-M1 'Goliath' Heavy Station Missile",
        type: "Missile",
        class: "Station",
        fireDuration: 400,
        fireStroke: 2,
        minDamage: 150,
        maxDamage: 250,
        armorPiercing: 50,
        minRange: 400,
        maxRange: 2200,
        optimalRange: 1800,
        accuracy: 450,
        projectileSpeed: 1,
        projectileMaxSpeed: 4,
        projectileAcceleration: 0.05,
        projectileAngularVelocity: 0.03,
        reload: 9,
        firingArc: 360,
    },
    {
        id: "medium-plasma-rifle",
        name: "MEC-M10 'Viper' Medium Plasma Rifle",
        type: "Plasma",
        class: "Medium",
        fireDuration: 200,
        fireStroke: 3,
        minDamage: [20, 22, 24, 26, 28, 30, 32, 34, 36, 40],
        maxDamage: [40, 44, 48, 52, 56, 60, 64, 68, 72, 80],
        armorPiercing: 15,
        minRange: 0,
        maxRange: 800,
        optimalRange: [400, 420, 440, 460, 480, 500, 520, 540, 560, 580],
        accuracy: 400,
        reload: 0.8,
        firingArc: 45.0
    },
    {
        id: "heavy-plasma-rifle",
        name: "MEC-H25 'Titan' Heavy Plasma Rifle",
        type: "Plasma",
        class: "Heavy",
        fireDuration: 250,
        fireStroke: 5,
        minDamage: [50, 55, 60, 65, 70, 75, 80, 85, 90, 100],
        maxDamage: [100, 110, 120, 130, 140, 150, 160, 170, 180, 200],
        armorPiercing: 30,
        minRange: 0,
        maxRange: 1200,
        optimalRange: [600, 630, 660, 690, 720, 750, 780, 810, 840, 870],
        accuracy: 350,
        reload: 1.5,
        firingArc: 35.0
    }
];