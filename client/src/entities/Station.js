import { Entity } from './Entity.js';

export class Station extends Entity {
  constructor(data) {
    super(data);
    this.radius = data.radius || 350;
    this.hull = data.hull;
    this.maxHull = data.maxHull;
    this.armor = data.armor;
    this.weaponLastFire = data.weaponLastFire || {};
    this.targetId = data.targetId || "";
  }

  update(data) {
    super.update(data);
    this.radius = data.radius || 350;
    this.hull = data.hull;
    this.maxHull = data.maxHull;
    this.armor = data.armor;
    this.weaponLastFire = data.weaponLastFire || {};
    this.targetId = data.targetId || "";
  }

  draw(p, factionColor, isTargeted, roomState, camAngle = 0) {
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.angle || 0);
    
    // Outer hull - CIRCLE
    p.stroke(factionColor);
    p.strokeWeight(3);
    p.noFill();
    p.ellipse(0, 0, this.radius * 2, this.radius * 2);
    
    // Perimeter Turret Bases
    const fillCol = p.color(factionColor);
    fillCol.setAlpha(51); // 0x33
    p.fill(fillCol);
    p.strokeWeight(1);
    
    const turretCount = 8;
    for (let i = 0; i < turretCount; i++) {
      const angle = (i / turretCount) * p.TWO_PI;
      const tx = Math.cos(angle) * this.radius;
      const ty = Math.sin(angle) * this.radius;
      p.push();
      p.translate(tx, ty);
      p.rotate(angle);
      p.rect(0, 0, 30, 30); 
      p.pop();
    }

    this.drawHUD(p, factionColor, isTargeted);
    p.pop();

    if (roomState) {
      this.drawDefense(p, factionColor, roomState);
    }
  }

  drawHUD(p, factionColor, isTargeted) {
    p.push();

    const barW = this.radius * 2 * 0.8;
    const barH = 18;
    const barY = -this.radius - 40;

    // Background (Original Points / Max Hull) - Now Red
    p.fill('#ef4444');
    p.stroke(255, 100);
    p.strokeWeight(1);
    p.rect(0, barY, barW, barH);

    // Current Points - Green
    const hPct = Math.max(0, this.hull / (this.maxHull || 40000));
    p.noStroke();
    p.fill('#4ade80');
    const currentW = barW * hPct;
    p.rect(-(barW - currentW) / 2, barY, currentW, barH);

    // Text Overlay
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);
    p.text(`${Math.round(this.hull)} / ${Math.round(this.maxHull || 40000)}`, 0, barY);

    if (isTargeted) {
      p.noFill();
      p.stroke('#ff3b30');
      p.strokeWeight(4);
      p.ellipse(0, 0, this.radius * 2.2, this.radius * 2.2);
    }
    p.pop();
  }

  drawDefense(p, factionColor, roomState) {
    const turretCount = 8;
    for (let i = 0; i < turretCount; i++) {
      const turretId = `${this.id}_t${i}`;
      const lastFire = this.weaponLastFire ? (typeof this.weaponLastFire.get === 'function' ? this.weaponLastFire.get(turretId) : this.weaponLastFire[turretId]) : 0;
      
      if (roomState.serverTime - lastFire < 250 && lastFire > 0) {
        const turretAngle = (i / turretCount) * p.TWO_PI + (this.angle || 0);
        const muzzleX = this.x + Math.cos(turretAngle) * this.radius;
        const muzzleY = this.y + Math.sin(turretAngle) * this.radius;

        const target = roomState.ships.get(this.targetId) || roomState.projectiles.get(this.targetId);

        if (target) {
          p.push();
          p.stroke(factionColor);
          p.strokeWeight(3);
          p.line(muzzleX, muzzleY, target.x, target.y);
          p.stroke(255);
          p.strokeWeight(1);
          p.line(muzzleX, muzzleY, target.x, target.y);
          p.pop();
        }
      }
    }
  }
}
