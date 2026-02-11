import { Entity } from './Entity.js';

export class Ship extends Entity {
  constructor(data) {
    super(data);
    this.name = data.name;
    this.shipClass = data.shipClass;
    this.isDead = data.isDead;
    this.isDocked = data.isDocked;
    this.hull = data.hull;
    this.maxHull = data.maxHull;
    this.targetId = data.targetId;
    this.weaponSlots = data.weaponSlots || [];
    this.weaponLevels = data.weaponLevels || [];
    this.equippedWeapons = data.equippedWeapons || [];
    this.weaponLastFire = data.weaponLastFire || {};
  }

  update(data) {
    super.update(data);
    this.name = data.name;
    this.shipClass = data.shipClass;
    this.isDead = data.isDead;
    this.isDocked = data.isDocked;
    this.hull = data.hull;
    this.maxHull = data.maxHull;
    this.targetId = data.targetId;
    this.weaponSlots = data.weaponSlots || [];
    this.weaponLevels = data.weaponLevels || [];
    this.equippedWeapons = data.equippedWeapons || [];
    this.weaponLastFire = data.weaponLastFire || {};
  }

  draw(p, zoom, factionColor, shipConfigs, allWeapons, roomState, camAngle = 0) {
    if (this.isDead || this.isDocked) return;

    p.push();
    p.translate(this.x, this.y);

    // Draw Name and Hull label above ship
    p.push();
    p.rotate(-camAngle); // Keep text upright on screen
    p.noStroke();
    p.fill(255, 255, 255, 180);
    p.textSize(12 / (zoom || 0.1));
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(this.name || 'Unknown Pilot', 0, -40 / (zoom || 0.1));
    p.pop();

    p.rotate(this.angle || 0);

    p.stroke(factionColor);
    p.strokeWeight(2 / (zoom || 0.1));
    p.noFill();

    this.drawShape(p);
    this.drawWeapons(p, zoom, factionColor, shipConfigs, allWeapons, roomState);

    p.pop();
  }

  drawShape(p) {
    if (this.shipClass === 'interceptor') {
      p.beginShape(); p.vertex(0, -25); p.vertex(-12, 25); p.vertex(0, 18); p.vertex(12, 25); p.endShape(p.CLOSE);
    } else if (this.shipClass === 'assault') {
      p.beginShape(); p.vertex(0, -50); p.vertex(-50, 0); p.vertex(-30, 50); p.vertex(30, 50); p.vertex(50, 0); p.endShape(p.CLOSE);
    } else if (this.shipClass === 'support') {
      p.beginShape(); p.vertex(-25, -150); p.vertex(25, -150); p.vertex(25, 150); p.vertex(-25, 150); p.endShape(p.CLOSE);
      p.line(-25, -100, 25, -100);
    } else {
      p.beginShape(); p.vertex(0, -20); p.vertex(-15, 15); p.vertex(0, 8); p.vertex(15, 15); p.endShape(p.CLOSE);
    }
  }

  drawWeapons(p, zoom, factionColor, shipConfigs, allWeapons, roomState) {
    const config = shipConfigs.find(s => s.id === this.shipClass);
    if (!config || !config.weapons) return;

    config.weapons.forEach((w, i) => {
      const isActive = this.weaponSlots[i];
      const wId = this.equippedWeapons[i];
      const wLevel = this.weaponLevels[i] || 1;
      const weaponDef = allWeapons.find(weap => weap.id === wId);
      
      if (!weaponDef) return;

      const lIdx = Math.max(0, wLevel - 1);
      const range = Array.isArray(weaponDef.maxRange) ? weaponDef.maxRange[lIdx] : (weaponDef.maxRange || 500);
      const fov = Array.isArray(weaponDef.firingArc) ? weaponDef.firingArc[lIdx] : (weaponDef.firingArc || 45);
      const fireStroke = (weaponDef.fireStroke || 1);
      
      p.push();
      p.translate(-w.mount.left, -w.mount.front);
      p.rotate(p.radians(w.mount.rotation));
      
      if (isActive) {
        // Visualize Firing Arc
        p.noFill();
        p.stroke(`${factionColor}66`);
        p.strokeWeight(1 / (zoom || 0.1));
        
        const halfFovRad = p.radians(fov / 2);
        const startAngle = -p.HALF_PI - halfFovRad;
        const endAngle = -p.HALF_PI + halfFovRad;
        
        p.arc(0, 0, range * 2, range * 2, startAngle, endAngle, p.OPEN);
        p.line(0, 0, p.cos(startAngle) * range, p.sin(startAngle) * range);
        p.line(0, 0, p.cos(endAngle) * range, p.sin(endAngle) * range);

        // Firing Effect
        this.drawFiringEffect(p, i, weaponDef, w, zoom, factionColor, roomState);
      }
      p.pop();
    });
  }

  drawFiringEffect(p, slotIdx, weaponDef, mountData, zoom, factionColor, roomState) {
    const now = roomState.serverTime;
    const lastFireData = this.weaponLastFire;
    const lastFire = (lastFireData && typeof lastFireData.get === 'function') 
      ? lastFireData.get(slotIdx.toString()) 
      : (lastFireData ? lastFireData[slotIdx.toString()] : 0) || 0;
    
    const fireDuration = weaponDef.fireDuration || 150;

    if (now - lastFire < fireDuration && lastFire > 0) {
      const target = roomState.ships.get(this.targetId) || 
                     roomState.stations.get(this.targetId) ||
                     roomState.projectiles.get(this.targetId);
      
      if (target) {
        // Muzzle pos
        const shipAngle = this.angle || 0;
        const cosA = Math.cos(shipAngle);
        const sinA = Math.sin(shipAngle);
        const mX = -mountData.mount.left;
        const mY = -mountData.mount.front;
        const muzzleWorldX = this.x + (mX * cosA - mY * sinA);
        const muzzleWorldY = this.y + (mX * sinA + mY * cosA);

        p.push();
        p.rotate(-p.radians(mountData.mount.rotation));
        p.rotate(-shipAngle);
        
        const isMissile = (weaponDef.type && String(weaponDef.type).toLowerCase() === 'missile') || 
                          (weaponDef.id && String(weaponDef.id).toLowerCase().includes('missile'));

        if (!isMissile) {
           p.stroke(factionColor);
           p.strokeWeight((weaponDef.fireStroke || 1) / (zoom || 0.1));
           const targetRelX = target.x - muzzleWorldX;
           const targetRelY = target.y - muzzleWorldY;
           p.line(0, 0, targetRelX, targetRelY);
        }
        p.pop();
      }
    }
  }
}
