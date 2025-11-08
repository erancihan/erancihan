import { Container } from "pixi.js";

import { createActor } from "../utils/create-actor";

class Scene extends Container {
  private actors: any[] = [];

  initalize() {
    this.actors.forEach((actor) => actor?.init?.());
  }

  update(dt: number) {
    this.actors.forEach((actor) => actor?.update?.(dt));
  }

  setActors(actors: any[]) {
    actors.forEach((data) => {
      const actor = createActor(data, this.scene);
      if (!actor) {
        console.warn(
          `Failed to create actor for data: ${JSON.stringify(data)}`
        );
        return;
      }

      this.addChild(actor);
      this.actors.push(actor);
    });

    actors.forEach((actor) => actor?.resolveSlots?.());
  }
}

export { Scene };
