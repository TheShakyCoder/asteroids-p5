export class Entity {
  constructor(data) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.angle = data.angle || 0;
    this.faction = data.faction;
  }

  update(data) {
    this.x = data.x;
    this.y = data.y;
    this.angle = data.angle || 0;
    this.faction = data.faction;
  }

  draw(p, factionColor) {
    // To be implemented by subclasses
  }
}
