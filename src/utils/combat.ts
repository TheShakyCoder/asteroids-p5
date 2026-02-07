/**
 * Calculate hit chance based on accuracy and distance
 */
export function rollHitChance({
  accuracy,
  optimalRange,
  maxRange,
  distance,
  evasion = 0 // Future proofing
}: {
  accuracy: number;
  optimalRange: number;
  maxRange: number;
  distance: number;
  evasion?: number;
}) {
  // Base hit chance from accuracy vs evasion
  // BSGO formula approx: Accuracy / (Accuracy + Evasion)? 
  // Let's use a simpler: (Accuracy / (400 + evasion))
  let baseChance = accuracy / (400 + evasion);

  // Range penalty: 100% at optimal, drops to 0 at max
  let rangeMod = 1.0;
  if (distance > optimalRange) {
    rangeMod = Math.max(0, 1 - (distance - optimalRange) / (maxRange - optimalRange));
  }

  const finalChance = baseChance * rangeMod;
  return Math.random() < finalChance;
}

/**
 * Calculate a BSGO-style hit result
 */
export function calculateHit({
  baseDamage,
  armor,
  armorPiercing,
  damageBonus = 0,
  damageReduction = 0
}: {
  baseDamage: number;
  armor: number;
  armorPiercing: number;
  damageBonus?: number;
  damageReduction?: number;
}) {
  // ... rest of the function stays same
  // --- Stage 1: Apply outgoing modifiers ---
  let modifiedDamage = baseDamage * (1 + damageBonus);

  // --- Stage 2: Effective Armor ---
  const effectiveArmor = Math.max(0, armor - armorPiercing);

  // Armor is treated as % reduction
  const armorReduction = effectiveArmor / 100;

  // --- Stage 3: Apply armor mitigation ---
  let damageAfterArmor = modifiedDamage * (1 - armorReduction);

  // --- Stage 4: Incoming reductions (defensive buffs etc) ---
  damageAfterArmor *= (1 - damageReduction);

  // Prevent negative numbers
  const finalHullDamage = Math.max(0, Math.round(damageAfterArmor));

  return {
    baseDamage,
    modifiedDamage,
    effectiveArmor,
    armorReduction,
    finalHullDamage
  };
}
