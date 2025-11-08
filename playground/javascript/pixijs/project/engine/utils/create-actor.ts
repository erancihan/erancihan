import { Circle } from "../actors/circle.js";

function createActor(entity: any) {
  switch (entity.type) {
    case "circle":
      return new Circle(entity);
    default:
      console.warn(`Unknown actor type: ${entity.type}`);
      return null;
  }
}

export { createActor };
