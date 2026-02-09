import { Entity } from './Entity.js';

export class Asteroid extends Entity {
  constructor(data) {
    super(data);
    this.radius = data.radius;
    // For procedurel irregularity, usually generated on create and kept consistent
    this.seed = Math.floor(this.x + this.y); 
  }

  update(data) {
    // Position doesn't usually change for asteroids in this game yet, but for future proofing:
    super.update(data);
    this.radius = data.radius;
  }

  draw(p, zoom) {
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.angle);
    
    p.noFill();
    p.stroke(150);
    p.strokeWeight(3 / zoom);
    
    // Procedural irregular shape
    p.beginShape();
    const steps = 12;
    p.randomSeed(this.seed);
    for (let i = 0; i < steps; i++) {
        const a = p.map(i, 0, steps, 0, p.TWO_PI);
        const r = this.radius * p.random(0.8, 1.2);
        p.vertex(p.cos(a) * r, p.sin(a) * r);
    }
    p.endShape(p.CLOSE);
    
    p.pop();
  }
}
