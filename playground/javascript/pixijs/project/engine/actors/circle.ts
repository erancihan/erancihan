import { Graphics } from "pixi.js";

import { Actor } from "./actor";

class Circle extends Actor {
  definition: any;

  constructor(definition: any = {}) {
    super();

    this.definition = definition;

    this.addChild(this.draw());
  }

  override init(): void {
    /**
     * Populate and configure the slots for other actors to connect to
     *
     * we know that the center of this circle is at (25, 25) in the graphics context
     * and the radius is 25, so we can use this information to position the slots
     * accordingly.
     *
     * slots will be positioned around the circle at equal intervals.
     */
    const numberOfSlots = this.definition?.slots?.length ?? 0;
    if (numberOfSlots === 0) {
      return; // No slots to create
    }

    const angleIncrement = (2 * Math.PI) / numberOfSlots;
    for (let i = 0; i < numberOfSlots; i++) {
      const angle = i * angleIncrement;
      const x = 25 + 25 * Math.cos(angle); // 25 is the radius
      const y = 25 + 25 * Math.sin(angle); // 25 is the radius

      // Create a slot at the calculated position
      const slot = new Graphics();
      slot.moveTo(x, y); // Move to the calculated position
      slot.circle(x, y, 5); // Draw a small circle to represent the slot
      slot.fill({ color: "#ffffff" });

      this.addChild(slot);

      // Store the slot in the slots array for further use
      this.slots.push({
        slotForId: this.definition.slots[i]?.id ?? `slot-${i}`,
        position: { x, y },
      });
    }
  }

  override resolveSlots(): void {
    // if has parent, connect to parent slots
  }

  override draw() {
    const graphics = new Graphics();

    graphics.moveTo(0, 0); // Move to the center of the circle
    graphics.circle(25, 25, 25); // Draw a circle at the center with radius 50
    graphics.fill({ color: this.definition?.color ?? "#66CCFF" });

    return graphics;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override update(dt: number): void {}
}

export { Circle };
