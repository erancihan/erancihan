import { Circle } from "../actors/circle.js";

function createActor(entity: any, scene: any): any {
  switch (entity.type) {
    case "circle":
      return new Circle(entity, scene);
    default:
      console.warn(`Unknown actor type: ${entity.type}`);
      return null;
  }
}

export { createActor };
