import { EnvMapReader } from './environemt-map-reader';
import type { CubeTexture, Scene, Texture } from 'three';
import { Color, DataTexture } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import type { GUI, GUIController } from 'dat.gui';

interface EnvironmentSceneFactory {
  generateScene(intensity: number, rotation: number): Scene;
}

export interface EnvironmentMap {
  rotation: number;
  intensity: number;
  readonly equirectangularTexture?: Texture;
}

type EnvironmentMapFactory = (
  environment: EnvironmentSceneFactory | CubeTexture | Texture,
  parameters?: object
) => EnvironmentMap;

export class EnvironmentMapCache {
  public defaultBackgroundColor: Color = new Color(0xffffff);
  public defaultEnvironmentColor: Color = new Color(0xc0c0c0);
  public defaultEnvironmentTexture: Texture;
  private _envMapReader?: EnvMapReader;
  private _exrLoader?: EXRLoader;
  private _rgbeLoader?: RGBELoader;
  private _environmentMapResources: Map<string, string> = new Map();
  private _environmentMap: Map<string, EnvironmentMap> = new Map();
  private _uiEnvironmentNames: string[] = [];
  private _uiFolder?: GUI = undefined;
  private _environmentController?: GUIController = undefined;
  private _environmentName: string = '';
  public currentEnvironment?: EnvironmentMap = undefined;
  private _showBackground: boolean = false;
  private _environmentMapFactory: EnvironmentMapFactory;

  constructor(environmentMapFactory: EnvironmentMapFactory) {
    this._environmentMapFactory = environmentMapFactory;
    this.defaultEnvironmentTexture = this._createUniformColorTexture(
      this.defaultEnvironmentColor
    );
  }

  private _createUniformColorTexture = (color: Color): Texture => {
    const colorTextureData = new Uint8Array([
      Math.floor(color.r * 255),
      Math.floor(color.g * 255),
      Math.floor(color.b * 255),
      255,
    ]);
    const colorTexture = new DataTexture(colorTextureData, 1, 1);
    colorTexture.needsUpdate = true;
    return colorTexture;
  };

  public setEnvironment(scene: Scene, parameters?: any): boolean {
    const defaultEnvironmentName = 'room environment';
    const _environmentName =
      this._environmentName.length > 0
        ? this._environmentName
        : defaultEnvironmentName;
    if (!this._environmentMap.has(_environmentName)) {
      if (this._environmentMapResources.has(_environmentName)) {
        const resource = this._environmentMapResources.get(
          _environmentName
        ) as string;
        this.loadFromResource(_environmentName, resource, false);
      }
    }
    const environment = this._environmentMap.get(_environmentName);
    const changed = this.currentEnvironment !== environment;
    this._showBackground = parameters?.showEnvironment ?? false;
    this.currentEnvironment = environment;
    if (this.currentEnvironment && parameters?.environmentRotation) {
      this.currentEnvironment.rotation = parameters.environmentRotation;
    }
    if (this.currentEnvironment && parameters?.environmentIntensity) {
      this.currentEnvironment.intensity = parameters.environmentIntensity;
    }
    scene.userData.showEnvironmentBackground = this._showBackground;
    scene.userData.environmentDefinition = this.currentEnvironment;
    return changed;
  }

  public loadDefaultEnvironment(
    changeEnvironment: boolean,
    createSceneGenerator: () => EnvironmentSceneFactory,
    _environmentName?: string
  ) {
    const defaultEnvironmentName = _environmentName ?? 'room environment';
    const roomSceneGenerator: EnvironmentSceneFactory = createSceneGenerator();
    this._environmentMap.set(
      defaultEnvironmentName,
      this._environmentMapFactory(roomSceneGenerator)
    );
    if (changeEnvironment) {
      this._environmentName = defaultEnvironmentName;
    }
    this.updateUI();
  }

  public loadFromResource(
    resourceName: string,
    resource: string,
    changeEnvironment: boolean
  ): boolean {
    const lowerName = resourceName.toLowerCase();
    let environmentMapLoaded = false;
    if (lowerName.endsWith('.exr')) {
      this.loadExr(resourceName, resource, changeEnvironment);
      environmentMapLoaded = true;
    } else if (lowerName.endsWith('.hdr')) {
      this.loadHdr(resourceName, resource, changeEnvironment);
      environmentMapLoaded = true;
    } else if (lowerName.endsWith('.envmap')) {
      this.loadEnvmap(resourceName, resource, changeEnvironment);
      environmentMapLoaded = true;
    }
    return environmentMapLoaded;
  }

  public loadEnvmap(
    resourceName: string,
    resource: string,
    changeEnvironment: boolean
  ) {
    this._loadAndSetCubeTexture((cubeTexture: CubeTexture) => {
      this._environmentMap.set(
        resourceName,
        this._environmentMapFactory(cubeTexture)
      );
      if (changeEnvironment) {
        this._environmentName = resourceName;
      }
      this.updateUI();
    }, resource);
  }

  public loadExr(
    resourceName: string,
    resource: string,
    changeEnvironment: boolean
  ) {
    this._loadExrAndSetTexture((texture: Texture, textureData: any) => {
      this._environmentMap.set(
        resourceName,
        this._environmentMapFactory(texture, { textureData })
      );
      if (changeEnvironment) {
        this._environmentName = resourceName;
      }
      this.updateUI();
    }, resource);
  }

  public loadHdr(
    resourceName: string,
    resource: string,
    changeEnvironment: boolean
  ) {
    this._loadHdrAndSetTexture((texture: Texture, textureData: any) => {
      this._environmentMap.set(
        resourceName,
        this._environmentMapFactory(texture, { textureData })
      );
      if (changeEnvironment) {
        this._environmentName = resourceName;
      }
      this.updateUI();
    }, resource);
  }

  private _loadAndSetCubeTexture(
    setCubeTexture: (cubeTexture: CubeTexture) => void,
    resource: string
  ): void {
    if (!resource) {
      return;
    }
    if (!this._envMapReader) {
      this._envMapReader = new EnvMapReader();
    }
    this._envMapReader.load(resource).then((texture: any) => {
      const cubeTexture = texture as CubeTexture;
      if (cubeTexture) {
        setCubeTexture(cubeTexture);
      }
    });
  }

  private _loadExrAndSetTexture(
    setTexture: (texture: Texture, textureData: any) => void,
    resource: string
  ) {
    if (!resource) {
      return;
    }
    if (!this._exrLoader) {
      this._exrLoader = new EXRLoader();
    }
    this._exrLoader.load(resource, (texture: Texture, textureData: any) => {
      setTexture(texture, textureData);
    });
  }

  private _loadHdrAndSetTexture(
    setTexture: (texture: Texture, textureData: any) => void,
    resource: string
  ): void {
    if (!resource) {
      return;
    }
    if (!this._rgbeLoader) {
      this._rgbeLoader = new RGBELoader();
    }
    this._rgbeLoader.load(resource, (texture: Texture, textureData: any) => {
      setTexture(texture, textureData);
    });
  }

  public addEnvironmentResources(resource: string[]): void {
    resource.forEach((resourceURl) => {
      const parts = resourceURl.split('/');
      const resourceName = parts[parts.length - 1];
      this._environmentMapResources.set(resourceName, resourceURl);
    });
    this.updateUI();
  }

  public addGUI(_uiFolder: GUI): void {
    this._uiFolder = _uiFolder;
    this.updateUI();
  }

  private updateUI(): void {
    if (
      this._uiFolder &&
      !this._uiEnvironmentNames.includes(this._environmentName)
    ) {
      this._uiEnvironmentNames = Array.from(this._environmentMap.keys());
      for (const _environmentName of this._environmentMapResources.keys()) {
        if (!this._uiEnvironmentNames.includes(_environmentName)) {
          this._uiEnvironmentNames.push(_environmentName);
        }
      }
      if (this._environmentController) {
        let innerHTMLStr = '';
        this._uiEnvironmentNames.forEach((_environmentName) => {
          innerHTMLStr += `<option value="${_environmentName}">${_environmentName}</option>`;
        });
        this._environmentController.domElement.children[0].innerHTML =
          innerHTMLStr;
        this._environmentController.setValue(this._environmentName);
        this._environmentController.updateDisplay();
      } else {
        this._environmentController = this._uiFolder.add<any>(
          this,
          '_environmentName',
          this._uiEnvironmentNames
        );
      }
    }
  }
}
