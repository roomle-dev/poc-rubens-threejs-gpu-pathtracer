import { ConfigurationGeometryConstructor } from 'roomle-core-hsc/src/loader/configurationGeometryConstructor';
import type { CoreModule } from 'roomle-core-hsc/src/embind/coreModule';
import {
  createSceneGroup,
  ThreeConfiguratorMeshFactory,
  type LoadedScene,
} from './three-configurator-mesh-factory';
import { Loader } from 'three';

export class ConfigurationLoader extends Loader {
  public async loadAsync(
    configurationId: string,
    coreModule?: CoreModule
  ): Promise<LoadedScene> {
    const configuratorMesh: ConfigurationGeometryConstructor =
      await ConfigurationGeometryConstructor.newGeometryConstructor(
        {},
        coreModule ?? {
          locateFile(path, prefix) {
            const filePath = (path.endsWith('.wasm') ? './' : prefix) + path;
            console.log('loading file: ' + filePath);
            return filePath;
          },
        }
      );
    const meshConstructionData =
      await configuratorMesh.constructMesh(configurationId);
    const sceneData = new ThreeConfiguratorMeshFactory().constructThreeMesh(
      meshConstructionData
    );
    return { scene: createSceneGroup(sceneData.geometryAndMaterial) };
  }
}
