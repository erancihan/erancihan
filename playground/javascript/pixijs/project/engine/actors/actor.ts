import { Container, type Graphics } from "pixi.js";

class Actor extends Container {
  slots: any[];

  constructor() {
    super();

    this.slots = [];
  }

  init(): void {
    // This method can be overridden by subclasses to implement custom initialization logic
  }

  resolveSlots(): any {}

  draw(): Graphics | null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(dt: number): void {
    // This method can be overridden by subclasses to implement custom update logic
  }
}

export { Actor };
