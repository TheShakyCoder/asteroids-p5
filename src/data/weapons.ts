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

        minDamage: [2,2.22,2.44,2.66,2.88,3.11,3.33,3.55,3.77,4],
        maxDamage: [18,20,22,24,26,28,30,32,34,36],
        dps: [20,22,24,26,28,30,32,34,36,40],

        armorPiercing: 10,
        minRange: 0,
        maxRange: 900,
        optimalRange: [350,370,390,410,430,450,470,490,510,530],

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

        minDamage: [4,4.44,4.88,5.33,5.77,6.22,6.66,7.11,7.55,8],
        maxDamage: [35,38.88,42.77,46.66,50.55,54.44,58.33,62.22,66.11,70],
        dps: [38,42,46,50,54,58,62,66,70,76],

        armorPiercing: 20,
        minRange: 0,
        maxRange: 950,
        optimalRange: [400,420,440,460,480,500,520,540,560,580],

        accuracy: 380,
        criticalOffense: 130,
        reload: 0.75,
        powerCost: 2.2,
        firingArc: 70,
        tylium: 30000
    }
];