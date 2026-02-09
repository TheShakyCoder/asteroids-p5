<script setup>
import { ref } from 'vue';

const props = defineProps({
  isDocked: Boolean,
  myPlayer: Object,
  shipConfigs: Array,
  allWeapons: Array
});

const emit = defineEmits(['undock', 'change-ship', 'buy-weapon', 'upgrade-weapon']);

const activeDockTab = ref('ships');

const handleBuyWeapon = (slotIndex, weaponId) => emit('buy-weapon', slotIndex, weaponId);
const handleUpgradeWeapon = (slotIndex) => emit('upgrade-weapon', slotIndex);
const handleChangeShip = (shipId) => emit('change-ship', shipId);
const handleUndock = () => emit('undock');
</script>

<template>
  <transition name="fade">
    <div v-if="isDocked" class="dock-overlay">
      <div class="dock-panel">
        <header class="dock-header">
          <div class="station-info">
            <h2>STATION COMMAND HUB</h2>
            <div class="tylium-display">
              <span class="label">TYLIUM RESERVES:</span>
              <span class="value">{{ myPlayer?.tylium?.toLocaleString() }} ⚛</span>
            </div>
          </div>
          <button @click="handleUndock" class="btn-departure">INITIATE DEPARTURE</button>
        </header>

        <nav class="dock-tabs">
          <button 
            :class="{ active: activeDockTab === 'ships' }" 
            @click="activeDockTab = 'ships'"
          >SHIP SELECTION</button>
          <button 
            :class="{ active: activeDockTab === 'shop' }" 
            @click="activeDockTab = 'shop'"
          >WEAPON SHOP</button>
          <button 
            :class="{ active: activeDockTab === 'armory' }" 
            @click="activeDockTab = 'armory'"
          >ARMORY (UPGRADES)</button>
        </nav>

        <div class="dock-content">
          <!-- Ship Selection Tab -->
          <div v-if="activeDockTab === 'ships'" class="tab-panel ships-tab">
            <div class="ship-grid">
              <div 
                v-for="s in shipConfigs" 
                :key="s.id" 
                class="ship-card"
                :class="{ current: myPlayer?.shipClass === s.id }"
              >
                <h3>{{ s.name }}</h3>
                <p class="ship-desc">{{ s.description }}</p>
                <div class="ship-stats">
                  <div class="stat"><span>HULL</span> {{ s.stats.hull }}</div>
                  <div class="stat"><span>ARMOR</span> {{ s.stats.armor }}</div>
                  <div class="stat"><span>SPEED</span> {{ s.stats.maxVelocity }}</div>
                </div>
                <button 
                  @click="handleChangeShip(s.id)" 
                  class="btn-select-ship"
                  :disabled="myPlayer?.shipClass === s.id"
                >
                  {{ myPlayer?.shipClass === s.id ? 'CURRENTLY ASSIGNED' : 'REQUISITION SHIP' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Weapon Shop Tab -->
          <div v-if="activeDockTab === 'shop'" class="tab-panel shop-tab">
            <div class="weapon-grid">
              <div v-for="w in allWeapons.filter(weapon => weapon.tylium)" :key="w.id" class="weapon-card">
                <div class="weapon-header">
                  <h4>{{ w.name }}</h4>
                  <template v-if="myPlayer?.ownedWeapons?.[w.id]">
                    <span class="owned-tag">OWNED [LVL {{ myPlayer.ownedWeapons[w.id] }}]</span>
                  </template>
                  <span v-else class="type">{{ w.type }}</span>
                </div>
                <div class="weapon-stats">
                  <div class="stat">RANGE: {{ w.maxRange }}</div>
                  <div class="stat" v-if="w.reload">RELOAD: {{ w.reload }}s</div>
                  <div class="price">
                    {{ myPlayer?.ownedWeapons?.[w.id] ? 'RE-EQUIP FREE' : `COST: ${w.tylium?.toLocaleString()} ⚛` }}
                  </div>
                </div>
                <div class="slot-selectors">
                  <p>Assign to Slot:</p>
                  <div class="slot-buttons">
                    <button 
                      v-for="(_, idx) in myPlayer?.equippedWeapons" 
                      @click="handleBuyWeapon(idx, w.id)"
                      :disabled="!myPlayer?.ownedWeapons?.[w.id] && (myPlayer?.tylium || 0) < w.tylium"
                    >SLOT {{ idx + 1 }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Armory Tab -->
          <div v-if="activeDockTab === 'armory'" class="tab-panel armory-tab">
            <div class="equipped-list">
              <div v-for="(wId, idx) in myPlayer?.equippedWeapons" :key="idx" class="equipped-weapon">
                <div class="info">
                  <span class="slot">SLOT {{ idx + 1 }}</span>
                  <h4>{{ allWeapons.find(w => w.id === wId)?.name || 'NONE' }}</h4>
                  <span class="level">LEVEL {{ myPlayer?.weaponLevels[idx] }}</span>
                </div>
                <div class="action" v-if="wId">
                  <p class="cost">UPGRADE: {{ Math.floor((allWeapons.find(w => w.id === wId)?.tylium || 10000) * 0.5 * (myPlayer?.weaponLevels[idx] || 1)) }} ⚛</p>
                  <button 
                    @click="handleUpgradeWeapon(idx)"
                    :disabled="myPlayer?.weaponLevels[idx] >= 10 || (myPlayer?.tylium || 0) < Math.floor((allWeapons.find(w => w.id === wId)?.tylium || 10000) * 0.5 * (myPlayer?.weaponLevels[idx] || 1))"
                  >
                    {{ myPlayer?.weaponLevels[idx] >= 10 ? 'MAX LEVEL' : 'UPGRADE' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Docking Styles */
.dock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(10, 10, 30, 0.95) 0%, #050510 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(15px);
  padding: 40px;
}

.dock-panel {
  width: 100%;
  max-width: 1000px;
  height: 100%;
  max-height: 800px;
  background: rgba(15, 15, 35, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
}

.dock-header {
  padding: 30px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.station-info h2 {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 0.2rem;
  color: #4facfe;
}

.tylium-display {
  margin-top: 5px;
  font-family: monospace;
}

.tylium-display .value {
  color: #fbbf24;
  font-weight: bold;
  font-size: 1.2rem;
  margin-left: 10px;
}

.btn-departure {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 10px 25px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-departure:hover {
  background: #ef4444;
  color: white;
}

.dock-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
}

.dock-tabs button {
  flex: 1;
  padding: 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-weight: bold;
  letter-spacing: 0.1rem;
  transition: all 0.3s;
}

.dock-tabs button.active {
  color: #4facfe;
  border-bottom-color: #4facfe;
  background: rgba(79, 172, 254, 0.05);
}

.dock-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}

/* Ship Tab Styles */
.ship-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.ship-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 25px;
  border-radius: 8px;
  transition: all 0.3s;
}

.ship-card.current {
  border-color: #4facfe;
  background: rgba(79, 172, 254, 0.05);
}

.ship-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  margin: 20px 0;
  gap: 10px;
}

.stat span {
  display: block;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.btn-select-ship {
  width: 100%;
  padding: 12px;
  border: 1px solid #4facfe;
  background: transparent;
  color: #4facfe;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-select-ship:hover:not(:disabled) {
  background: #4facfe;
  color: white;
}

/* Weapon Shop Style */
.weapon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.weapon-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 8px;
}

.weapon-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.weapon-header h4 { margin: 0; color: #fff; }
.weapon-header .type { font-size: 0.8rem; color: #4facfe; }
.weapon-header .owned-tag { font-size: 0.7rem; color: #4ade80; border: 1px solid #4ade80; padding: 2px 5px; border-radius: 3px; font-weight: bold; }

.price { color: #fbbf24; font-weight: bold; margin-top: 10px; }

.slot-selectors {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.slot-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.slot-buttons button {
  flex: 1;
  padding: 8px;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
}

.slot-buttons button:hover:not(:disabled) {
  border-color: #4facfe;
}

/* Armory Styles */
.equipped-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.equipped-weapon {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 8px;
}

.equipped-weapon .info .slot { color: #4facfe; font-size: 0.8rem; }
.equipped-weapon h4 { margin: 5px 0; }
.equipped-weapon .level { color: #fbbf24; font-weight: bold; }

.equipped-weapon .action { text-align: right; }
.equipped-weapon .cost { font-size: 0.9rem; margin-bottom: 5px; color: #fbbf24; }

.equipped-weapon button {
  padding: 8px 20px;
  background: #4facfe;
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.equipped-weapon button:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
