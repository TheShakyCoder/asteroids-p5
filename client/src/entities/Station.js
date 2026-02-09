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
  }

  update(data) {
    super.update(data);
    this.hull = data.hull;
    this.maxHull = data.maxHull;
    this.armor = data.armor;
    this.weaponLastFire = data.weaponLastFire || {};
  }

  draw(p, zoom, factionColor, isTargeted, roomState) {
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.angle || 0);
    
    // Outer hull
    p.stroke(factionColor);
    p.strokeWeight(3 / zoom);
    p.noFill();
    p.rect(0, 0, this.width, this.height);
    
    // Corner Turrets
    p.fill(factionColor + '33');
    p.strokeWeight(1 / zoom);
    const tx = this.width / 2;
    const ty = this.height / 2;
    p.rect(-tx, -ty, 20, 20); // TL
    p.rect(tx, -ty, 20, 20);  // TR
    p.rect(-tx, ty, 20, 20);  // BL
    p.rect(tx, ty, 20, 20);   // BR
    p.pop();

    this.drawHUD(p, zoom, factionColor, isTargeted);
    if (roomState) {
      this.drawDefense(p, zoom, factionColor, roomState);
    }
  }

  drawHUD(p, zoom, factionColor, isTargeted) {
    p.push();
    p.translate(this.x, this.y);
    // p.noStroke();
    // p.fill(factionColor);
    // p.textSize(20 / zoom);
    // p.textAlign(p.CENTER, p.CENTER);
    // p.text(this.faction === 'humans' ? 'TERRAN STATION' : 'MARTIAN STATION', 0, -this.height / 2 - 40);

    const barW = this.width * 0.8;
    const barH = 10 / zoom;
    p.fill(0, 0, 0, 100);
    p.rect(0, -this.height / 2 - 20, barW, barH);
    const hPct = Math.max(0, this.hull / (this.maxHull || 40000));
    p.fill(hPct > 0.3 ? '#4ade80' : '#ef4444');
    p.rect(-(barW * (1 - hPct)) / 2, -this.height / 2 - 20, barW * hPct, barH);

    if (isTargeted) {
      p.noFill();
      p.stroke('#ff3b30');
      p.strokeWeight(4 / zoom);
      p.rect(0, 0, this.width * 1.2, this.height * 1.5);
    }
    p.pop();
  }

  drawDefense(p, zoom, factionColor, roomState) {
    const turretPos = [
      {x: -250, y: -35}, {x: -250, y: -35}, {x: 250, y: -35}, {x: 250, y: -35},
      {x: -250, y: 35}, {x: -250, y: 35}, {x: 250, y: 35}, {x: 250, y: 35}
    ];

    turretPos.forEach((tp, idx) => {
      const turretId = `${this.id}_t${idx}`;
      const lastFire = this.weaponLastFire ? (typeof this.weaponLastFire.get === 'function' ? this.weaponLastFire.get(turretId) : this.weaponLastFire[turretId]) : 0;
      
      if (roomState.serverTime - lastFire < 250 && lastFire > 0) {
        const muzzleX = this.x + (tp.x * Math.cos(this.angle || 0) - tp.y * Math.sin(this.angle || 0));
        const muzzleY = this.y + (tp.x * Math.sin(this.angle || 0) + tp.y * Math.cos(this.angle || 0));

        let nearest = null;
        let minDist = 1800;
        
        roomState.players.forEach(pl => {
          if (pl.faction === this.faction || pl.isDead || pl.isDocked) return;
          const d = Math.sqrt((pl.x - muzzleX) ** 2 + (pl.y - muzzleY) ** 2);
          if (d < minDist) { minDist = d; nearest = pl; }
        });
        
        roomState.projectiles.forEach(pj => {
          if (pj.faction === this.faction || (pj.type !== 'drone' && pj.type !== 'missile')) return;
          const d = Math.sqrt((pj.x - muzzleX) ** 2 + (pj.y - muzzleY) ** 2);
          if (d < minDist) { minDist = d; nearest = pj; }
        });

        if (nearest) {
          p.push();
          p.stroke(factionColor);
          p.strokeWeight(3);
          p.line(muzzleX, muzzleY, nearest.x, nearest.y);
          p.stroke(255);
          p.strokeWeight(1);
          p.line(muzzleX, muzzleY, nearest.x, nearest.y);
          p.pop();
        }
      }
    });
  }
}
