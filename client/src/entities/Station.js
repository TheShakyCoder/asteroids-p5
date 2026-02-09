import { Entity } from './Entity.js';

export class Station extends Entity {
  constructor(data) {
    super(data);
    this.width = 700;
    this.height = 120;
    this.hull = data.hull;
    this.maxHull = data.maxHull;
    this.armor = data.armor;
    this.weaponLastFire = data.weaponLastFire || {};
    this.targetId = data.targetId || "";
  }

  update(data) {
    super.update(data);
    this.hull = data.hull;
    this.maxHull = data.maxHull;
    this.armor = data.armor;
    this.weaponLastFire = data.weaponLastFire || {};
    this.targetId = data.targetId || "";
  }

  draw(p, zoom, factionColor, isTargeted, roomState, camAngle = 0) {
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.angle || 0);
    
    // Outer hull
    p.stroke(factionColor);
    p.strokeWeight(3 / (zoom || 0.1));
    p.noFill();
    p.rect(0, 0, this.width, this.height);
    
    // Corner Turrets
    p.fill(factionColor + '33');
    p.strokeWeight(1 / (zoom || 0.1));
    const tx = this.width / 2;
    const ty = this.height / 2;
    p.rect(-tx, -ty, 20, 20); // TL
    p.rect(tx, -ty, 20, 20);  // TR
    p.rect(-tx, ty, 20, 20);  // BL
    p.rect(tx, ty, 20, 20);   // BR

    this.drawHUD(p, zoom, factionColor, isTargeted);
    p.pop();

    if (roomState) {
      this.drawDefense(p, factionColor, roomState);
    }
  }

  drawHUD(p, zoom, factionColor, isTargeted) {
    p.push();

    const barW = this.width * 0.8;
    const barH = 18 / (zoom || 0.1);
    const barY = -this.height / 2 - 30 / (zoom || 0.1);

    // Background (Original Points / Max Hull) - Now Red
    p.fill('#ef4444');
    p.stroke(255, 100);
    p.strokeWeight(1 / (zoom || 0.1));
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
    p.textSize(12 / (zoom || 0.1));
    p.text(`${Math.round(this.hull)} / ${Math.round(this.maxHull || 40000)}`, 0, barY);

    if (isTargeted) {
      p.noFill();
      p.stroke('#ff3b30');
      p.strokeWeight(4 / (zoom || 0.1));
      p.rect(0, 0, this.width * 1.2, this.height * 1.5);
    }
    p.pop();
  }

  drawDefense(p, factionColor, roomState) {
    const turretPos = [
      {x: -this.width / 2, y: -this.height / 2}, {x: -this.width / 2, y: -this.height / 2}, {x: this.width / 2, y: -this.height / 2}, {x: this.width / 2, y: -this.height / 2},
      {x: -this.width / 4, y: this.height / 2}, {x: -this.width / 4, y: this.height / 2}, {x: this.width / 4, y: this.height / 2}, {x: this.width / 4, y: this.height / 2}
    ];

    turretPos.forEach((tp, idx) => {
      const turretId = `${this.id}_t${idx}`;
      const lastFire = this.weaponLastFire ? (typeof this.weaponLastFire.get === 'function' ? this.weaponLastFire.get(turretId) : this.weaponLastFire[turretId]) : 0;
      
      if (roomState.serverTime - lastFire < 250 && lastFire > 0) {
        const muzzleX = this.x + (tp.x * Math.cos(this.angle || 0) - tp.y * Math.sin(this.angle || 0));
        const muzzleY = this.y + (tp.x * Math.sin(this.angle || 0) + tp.y * Math.cos(this.angle || 0));

        const target = roomState.players.get(this.targetId) || roomState.projectiles.get(this.targetId);

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
    });
  }
}
