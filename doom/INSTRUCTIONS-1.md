# Developer Handover: Advanced Monster System & Level Design Protocol

Welcome. You are tasked with taking the core raycaster engine and building `level2.html` (and beyond). This document details the exact requirements for implementing varied monster types, hybrid image/fallback rendering, infinite vertical hitboxes, and level layouts.

---

## 1. Engine Alignment & Hitscan Mechanics

In a classic 2D raycaster lacking pitch control (looking up/down), vertical depth is purely simulated. Standard horizontal raycasting does not track $Y$-height targeting.

### Infinite Vertical Hitbox Protocol
When calculating player shots via hitscan (`Player.shoot()`), treat enemies as **vertical cylinders that extend infinitely from floor to ceiling**.

1. **Ray Sweep**: When firing, cast a ray along the player's viewing angle vector.
2. **Hit Checking**: Compare the distance between the hitscan ray and each monster's world position $(x, y)$.
3. **Threshold Check**: If the perpendicular distance from the ray line to the monster's center is less than `monster.radius`, register a hit—**regardless of vertical alignment**.
4. **Obstacle Blocking**: Ensure wall raycasts process first. If a wall tile (`>= 1`) is closer than the monster along the shot path, the wall blocks the bullet.

```javascript
// Hitscan logic snippet inside Player.shoot()
let closestMonster = null;
let minDistance = Infinity;

monsters.forEach(monster => {
  if (!monster.isAlive) return;

  // Calculate perpendicular distance to the shooting ray
  const dx = monster.x - this.x;
  const dy = monster.y - this.y;
  const rayDistance = dx * Math.cos(this.angle) + dy * Math.sin(this.angle);

  // Check if monster is in front of player
  if (rayDistance > 0) {
    const perpDist = Math.abs(-dx * Math.sin(this.angle) + dy * Math.cos(this.angle));
    
    // Check if ray passes through monster radius and is unblocked by walls
    if (perpDist < monster.radius && rayDistance < minDistance) {
      if (!map.isRayBlockedByWall(this.x, this.y, monster.x, monster.y)) {
        minDistance = rayDistance;
        closestMonster = monster;
      }
    }
  }
});

if (closestMonster) {
  closestMonster.takeDamage(this.activeWeapon.damage);
}