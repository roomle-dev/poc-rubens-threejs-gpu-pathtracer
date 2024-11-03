import { SCENE_TYPE, type SceneType } from './scene-cache';

export interface SceneSourceModel {
  type: SceneType;
  name: string;
  id: string;
  resource?: string;
}

export class SceneSourceContainer {
  private _scenes: SceneSourceModel[] = [];

  public get scenes(): SceneSourceModel[] {
    return this._scenes;
  }

  public addIds(ids: string[]): void {
    ids.forEach((sceneId) => {
      let type: SceneType = SCENE_TYPE.PLAN;
      let name = sceneId;
      if (sceneId.includes('.glb')) {
        type = SCENE_TYPE.GLB;
        name = SceneSourceContainer.getNameFromGlbResourceName(sceneId);
      } else if (sceneId.startsWith('ps_') || sceneId.indexOf(':') === -1) {
        type = SCENE_TYPE.PLAN;
        name = `PLAN ${sceneId}`;
      } else {
        type = SCENE_TYPE.CONFIGURATION;
        const p = sceneId.split('@');
        const id = p[p.length - 1];
        const names = id.split(':');
        name = names.length > 1 ? `${names[0]} ${names[1]}` : names[0];
      }
      let count = 1;
      while (this._scenes.find((item) => item.name === name) !== undefined) {
        name = name + count++;
      }
      this._scenes.push({ type, name, id: sceneId });
    });
  }

  public getSceneMapForUI() {
    const configuratorMenuItems = Object.assign(
      {},
      ...this._scenes.map((item: any) => ({
        [item.name]: JSON.stringify(item),
      }))
    );
    return configuratorMenuItems;
  }

  public static getNameFromGlbResourceName(id: string): string {
    const lastIndex = id.lastIndexOf('.glb');
    let name = id.substring(0, lastIndex);
    const parts = name.split('/');
    return `GLB ${parts[parts.length - 1]}`;
  }
}
