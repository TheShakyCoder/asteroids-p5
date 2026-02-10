<script setup lang="ts">
const props = defineProps({
  myPlayer: Object,
  connectionStatus: String,
  serverVersion: String,
  clientVersion: String,
  currentZoomIndex: Number,
  cameraRotationActive: Boolean,
  targetData: Object,
  hullPct: Number,
  armorPct: Number,
  moveKeys: Object
});
</script>

<template>
  <div v-if="myPlayer"
    style="position: absolute; font-size: 1.5rem; color: white; z-index: 100; top: 10px; left: 20px;">
    <h2>Player Debug</h2>
    <dl>
      <dt>Link:</dt>
      <dd>{{ connectionStatus }}</dd>
      <dt>S-Ver:</dt>
      <dd>{{ serverVersion }}</dd>
      <dt>C-Ver:</dt>
      <dd>{{ clientVersion }}</dd>
      <dt>Position:</dt>
      <dd>{{ Math.round(myPlayer.x || 0) }}, {{ Math.round(myPlayer.y || 0) }}</dd>
      <dt>Vector:</dt>
      <dd>{{ Math.round(myPlayer.vx || 0) }}, {{ Math.round(myPlayer.vy || 0) }}</dd>
      <dt>Zoom [v]</dt>
      <dd>{{ currentZoomIndex === 0 ? 'CLOSEUP' : 'LONG-RANGE' }}</dd>
      <dt>Camera [c]</dt>
      <dd>{{ cameraRotationActive ? 'SHIP ALIGNED' : 'WORLD ALIGNED' }}</dd>
      <dt>Target [t]:</dt>
      <dd>{{ targetData ? targetData.name : 'NONE' }} <span v-if="targetData && !targetData.connected" style="color: #ff3b30; font-size: 0.8rem; font-weight: bold;">(OFFLINE)</span></dd>
      <template v-if="targetData">
        <dt>T-Hull:</dt>
        <dd class="status-bar-container">
          <div class="status-bar hull-bar" :class="{ low: targetData.hullPct < 0.3 }"
            :style="{ width: (targetData.hullPct * 100) + '%' }"></div>
          <span class="status-val">{{ Math.round(targetData.hull) }} / {{ Math.round(targetData.maxHull) }}</span>
        </dd>
        <dt v-if="targetData.maxArmor > 0">T-Armor:</dt>
        <dd v-if="targetData.maxArmor > 0" class="status-bar-container">
          <div class="status-bar armor-bar" :style="{ width: (targetData.armorPct * 100) + '%' }"></div>
          <span class="status-val">{{ Math.round(targetData.armor) }} / {{ Math.round(targetData.maxArmor) }}</span>
        </dd>
      </template>
      <dt>Hull:</dt>
      <dd class="status-bar-container">
        <div class="status-bar hull-bar" :class="{ low: hullPct < 0.3 }" :style="{ width: (hullPct * 100) + '%' }"></div>
        <span class="status-val">{{ Math.round(myPlayer.hull) }}</span>
      </dd>
      <dt>Armor:</dt>
      <dd class="status-bar-container">
        <div class="status-bar armor-bar" :style="{ width: (armorPct * 100) + '%' }"></div>
        <span class="status-val">{{ Math.round(myPlayer.armor) }}</span>
      </dd>
      <dt>Controls:</dt>
      <dd class="controls-grid">
        <span :class="{ active: moveKeys.w }">THRUST</span>
        <span :class="{ active: moveKeys.a }">L-PBT</span>
        <span :class="{ active: moveKeys.d }">R-PBT</span>
        <span :class="{ active: moveKeys.s }">RETRO</span>
      </dd>
    </dl>
  </div>
</template>

<style scoped>
.status-bar-container {
  width: 150px;
  height: 12px;
  background: rgba(40, 40, 40, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.status-bar {
  height: 100%;
  transition: width 0.3s ease-out;
}

.hull-bar {
  background: #4ade80;
}

.hull-bar.low {
  background: #ef4444;
}

.armor-bar {
  background: #fbbf24;
}

.status-val {
  position: absolute;
  right: 5px;
  font-size: 0.8rem;
  color: white;
  text-shadow: 1px 1px 2px black;
  font-family: monospace;
}

.controls-grid {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
  font-family: monospace;
  margin-top: 5px;
}

.controls-grid .active {
  color: #4facfe;
  text-shadow: 0 0 5px rgba(79, 172, 254, 0.5);
  font-weight: bold;
}
</style>
