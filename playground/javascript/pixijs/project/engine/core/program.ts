import { Application, type ApplicationOptions } from "pixi.js";

import { Scene } from "./scene";

class Program {
  public app: Application;

  private scene: Scene | null = null;

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
