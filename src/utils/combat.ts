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
