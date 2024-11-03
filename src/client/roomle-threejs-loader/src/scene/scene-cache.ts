import { ConfigurationLoader } from './configuration-loader';
import type { CoreModule } from 'roomle-core-hsc/src/embind/coreModule';
import { PlanLoader } from './plan-loader';
import type { AnimationClip } from 'three';
import { Mesh, MeshStandardMaterial, type Object3D } from 'three';
import type { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import type { SceneSourceModel } from './scene-source';

type Enumify<T> = T[keyof T];

export const SCENE_TYPE = {
  GLB: 'glb',
  CONFIGURATION: 'configuration',
  PLAN: 'plan',
} as const;

export type SceneType = Enumify<typeof SCENE_TYPE>;

export interface SceneModel {
  type: SceneType;
  sceneObject: Object3D;
  animations: AnimationClip[];
}

export class SceneCache {
  private _sceneCache: Map<string, SceneModel> = new Map();
  private _renderUpdateCallback?: () => void;
  private _dracoLoader: DRACOLoader;
  private _coreModule?: CoreModule;

  constructor(
    dracoLoader: DRACOLoader,
    coreModule?: CoreModule,
    renderUpdateCallback?: () => void
  ) {
    this._dracoLoader = dracoLoader;
    this._coreModule = coreModule;
    this._renderUpdateCallback = renderUpdateCallback;
  }

  public getScene(key: string): SceneModel | null {
    return this._sceneCache.get(key) ?? null;
  }

  public async getOrLoadScene(
    sceneSource: SceneSourceModel
  ): Promise<SceneModel> {
    let sceneModel = this.getScene(sceneSource.id);
    if (sceneModel) {
      return sceneModel;
    }
    switch (sceneSource.type) {
      case SCENE_TYPE.CONFIGURATION:
        sceneModel = await this._loadConfiguration(sceneSource.id);
        break;
      case SCENE_TYPE.PLAN:
        sceneModel = await this._loadPlan(sceneSource.id);
        break;
      case SCENE_TYPE.GLB:
        sceneModel = await this._loadGLb(
          sceneSource.resource ?? sceneSource.id
        );
        break;
    }
    this._sceneCache.set(sceneSource.id, sceneModel);
    return sceneModel as SceneModel;
  }

  public async loadSceneFromId(idOrUrl: string): Promise<SceneModel> {
    let sceneModel: SceneModel;
    const lowerCaseIdOrUrl = idOrUrl.toLowerCase();
    if (
      lowerCaseIdOrUrl.endsWith('.glb') ||
      lowerCaseIdOrUrl.endsWith('.gltf')
    ) {
      sceneModel = await this._loadGLb(idOrUrl);
    } else if (idOrUrl.startsWith('ps_') || idOrUrl.indexOf(':') === -1) {
      sceneModel = await this._loadPlan(idOrUrl);
    } else {
      sceneModel = await this._loadConfiguration(idOrUrl);
    }
    return sceneModel;
  }

  private async _loadConfiguration(
    configurationId: string
  ): Promise<SceneModel> {
    const configurationLoader = new ConfigurationLoader();
    const loadedScene = await configurationLoader.loadAsync(
      configurationId,
      this._coreModule
    );
    return {
      type: SCENE_TYPE.CONFIGURATION,
      sceneObject: loadedScene.scene,
      animations: [],
    };
  }

  private async _loadPlan(planId: string): Promise<SceneModel> {
    const planLoader = new PlanLoader(
      this._dracoLoader,
      this._renderUpdateCallback
    );
    const loadedScene = await planLoader.loadAsync(planId, this._coreModule);
    return {
      type: SCENE_TYPE.PLAN,
      sceneObject: loadedScene.scene,
      animations: [],
    };
  }

  private async _loadGLb(resource: string): Promise<SceneModel> {
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(this._dracoLoader);
    const gltf = await gltfLoader.loadAsync(resource);
    this._updateGLTFScene(gltf, (mesh: Mesh) => {
      if (mesh.isMesh) {
        const material = mesh.material;
        if (material instanceof MeshStandardMaterial) {
          if (material.transparent === false) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        }
      }
    });
    return {
      type: SCENE_TYPE.GLB,
      sceneObject: gltf.scene,
      animations: gltf.animations,
    };
  }

  private _updateGLTFScene(gltf: GLTF, updateMesh: (mesh: Mesh) => void): void {
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        updateMesh(child);
        if (child.material instanceof MeshStandardMaterial) {
          child.material.envMapIntensity = 1;
          child.material.needsUpdate = true;
        }
      }
    });
  }
}
