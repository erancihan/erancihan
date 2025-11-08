import { Application, Container, type ApplicationOptions } from "pixi.js";

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
      const actor = createActor(data);
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

class Program {
  public app: Application;

  private scene: Scene | null = null;

  private actors: any[] = [];

  constructor() {
    this.app = new Application();
  }

  async create(value: HTMLDivElement, config: Partial<ApplicationOptions>) {
    if (!value) {
      throw new Error("Container element is required");
    }

    await this.app.init(config);

    value.appendChild(this.app.canvas);

    this.scene ??= new Scene();
    this.app.stage.addChild(this.scene);
  }

  initialize() {
    if (!this.scene) {
      console.warn("Container is not initialized. Please call create() first.");
      return;
    }

    this.scene.initalize();
  }

  start() {
    this.app.ticker.add((ticker) => {
      this.scene?.update(ticker.deltaTime);
    });
  }

  setActors(actors: any[]) {
    if (!this.scene) {
      console.warn("Container is not initialized. Please call create() first.");
      return;
    }

    this.scene.setActors(actors);
  }
}

export default Program;
