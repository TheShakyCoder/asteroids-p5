import { Entity } from './Entity.js';

export class Projectile extends Entity {
  constructor(data) {
    super(data);
    this.type = data.type;
    this.speed = data.speed;
  }

  update(data) {
    super.update(data);
    this.type = data.type;
    this.speed = data.speed;
  }

  draw(p, factionColor) {
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.angle);

    p.stroke(factionColor);
    p.strokeWeight(2);

    if (this.type === 'missile') {
      p.noFill();
      p.beginShape(); p.vertex(0, -6); p.vertex(-2, 6); p.vertex(2, 6); p.endShape(p.CLOSE);
      p.strokeWeight(1);
      p.line(-2, 6, -4, 8);
      p.line(2, 6, 4, 8);
    } else if (this.type === 'drone') {
      p.noFill();
      p.ellipse(0, 0, 10, 10);
      p.fill(factionColor);
      p.ellipse(0, 0, 3, 3);
    } else {
      // Standard bullet
      p.line(0, -5, 0, 5);
    }

    p.pop();
  }
}
