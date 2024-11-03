import type {
  PlanObjectMesh,
  CatalogItemData,
} from 'roomle-core-hsc/src/loader/planElementManager';
import { PlanElementManager } from 'roomle-core-hsc/src/loader/planElementManager';
import {
  createSceneGroup,
  ThreeConfiguratorMeshFactory,
  type LoadedScene,
} from './three-configurator-mesh-factory';
import type {
  MaterialProperties,
  MeshConstructionData,
} from 'roomle-core-hsc/src/loader/loaderUtility';
import { getMaterialProperties } from 'roomle-core-hsc/src/loader/loaderUtility';
import { ThreeMaterialFactory } from './three-material-factory';
import type { Material, Object3D } from 'three';
import {
  Box3,
  Color,
  DoubleSide,
  Group,
  Loader,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  Vector2,
  Vector3,
} from 'three';
import type { Wall } from 'roomle-core-hsc/src/embind/plannerCoreInterface';
import {
  CORE_MATERIAL_SOURCE_TYPE,
  CORE_PLAN_ELEMENT_TYPE,
} from 'roomle-core-hsc/src/embind/plannerCoreInterface';
import {
  convertVector3fToTree,
  convertVectorToTree,
  ThreeGeometryFactory,
} from './three-geometry-factory';
import type { CoreModule } from 'roomle-core-hsc/src/embind/coreModule';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import type { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import type { WallMode } from './wall-model';

export class PlanLoader extends Loader {
  private _materialFactory: ThreeMaterialFactory;
  private _geometryFactory: ThreeGeometryFactory;
  private _meshFactory: ThreeConfiguratorMeshFactory;
  private _materialProperties: Map<string, MaterialProperties> = new Map();
  private _threeMaterials: Map<string, Material> = new Map();
  private _defaultMaterial = new MeshPhysicalMaterial({
    color: '#ffffff',
    side: DoubleSide,
  });
  private _defaultMaterialFloor = new MeshPhysicalMaterial();
  private _gltfLoader: GLTFLoader = new GLTFLoader();
  private _renderUpdateCallback: () => void = () => {};

  constructor(dracoLoader: DRACOLoader, renderUpdateCallback?: () => void) {
    super();
    this._materialFactory = new ThreeMaterialFactory();
    this._geometryFactory = new ThreeGeometryFactory();
    this._meshFactory = new ThreeConfiguratorMeshFactory(
      this._materialFactory,
      this._geometryFactory
    );
    this._gltfLoader.setDRACOLoader(dracoLoader);
    if (renderUpdateCallback) {
      this._renderUpdateCallback = renderUpdateCallback;
    }
  }

  public async loadAsync(
    planId: string,
    coreModule?: CoreModule
  ): Promise<LoadedScene> {
    const planElementManager: PlanElementManager =
      await PlanElementManager.newPlanElementManager(
        undefined,
        undefined,
        coreModule ?? {
          locateFile(path, prefix) {
            const filePath = (path.endsWith('.wasm') ? './' : prefix) + path;
            console.log('loading file: ' + filePath);
            return filePath;
          },
        }
      );
    await planElementManager.loadPlanFromId(planId);
    await planElementManager.createGeometry();
    this._debugLogPlanElements(planElementManager);
    const scene = this._generateScene(planElementManager);
    return { scene };
  }

  private _generateScene(_planElementManager: PlanElementManager): Group {
    const sceneGroup = new Group();
    this._generateMaterials(_planElementManager);
    this._generatePlanElements(_planElementManager, sceneGroup);
    this._generateConfigurablePlanObjects(_planElementManager, sceneGroup);
    this._generateStaticPlanObjects(_planElementManager, sceneGroup);
    return sceneGroup;
  }

  private _generateMaterials(planElementManager: PlanElementManager) {
    const materials = planElementManager.materials;
    materials.forEach((material, materialId) => {
      const materialProperties = getMaterialProperties(material);
      this._materialProperties.set(materialId, materialProperties);
      const threeMaterial = this._materialFactory.createThreeMaterial(
        materialId,
        materialProperties
      );
      this._threeMaterials.set(materialId, threeMaterial);
    });
  }

  private _generatePlanElements(
    planElementManager: PlanElementManager,
    sceneGroup: Group
  ) {
    const wallModels = this._generateWallModels(planElementManager);
    const planMeshes = planElementManager.planMeshes;
    for (const planMesh of planMeshes) {
      if (planMesh.type === CORE_PLAN_ELEMENT_TYPE.CEILING) {
        continue;
      }
      let materialType = planMesh.material.getSourceType().value;
      let material: Material = this._defaultMaterial;
      if (planMesh.type === CORE_PLAN_ELEMENT_TYPE.FLOOR) {
        material = this._defaultMaterialFloor;
      }
      if (materialType === CORE_MATERIAL_SOURCE_TYPE.MATERIAL) {
        material =
          this._threeMaterials.get(planMesh.material.materialId) ?? material;
      } else if (materialType === CORE_MATERIAL_SOURCE_TYPE.RGBVALUE) {
        material = new MeshPhysicalMaterial({
          color: planMesh.material.rgbValue,
        });
      } else if (materialType === CORE_MATERIAL_SOURCE_TYPE.CATALOGITEM) {
        material =
          this._generateMaterialFromCatalogItem(
            planElementManager,
            planMesh.material.catalogItemId
          ) ?? material;
      }
      const geometry = this._geometryFactory.createThreeGeometry(planMesh);
      const mesh = new Mesh(geometry, material);
      const position = convertVectorToTree(planMesh.position);
      mesh.position.copy(position);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      if (planMesh.type === CORE_PLAN_ELEMENT_TYPE.FLOOR) {
        mesh.userData.isPlanFloor = true;
      } else if (planMesh.type === CORE_PLAN_ELEMENT_TYPE.WALL) {
        mesh.userData.isPlanWall = true;
        if (wallModels.has(planMesh.id)) {
          mesh.userData.wallModel = wallModels.get(planMesh.id);
        }
      }
      sceneGroup.add(mesh);
    }
  }

  private _generateWallModels(planElementManager: PlanElementManager) {
    const wallModels = new Map<number, WallMode>();
    for (const planElement of planElementManager.planElements) {
      if (planElement.getType().value === CORE_PLAN_ELEMENT_TYPE.WALL) {
        const wall = planElement as Wall;
        let wallModel = {
          wallType: wall.wallType,
          rightNormal: convertVector3fToTree(wall.rightNormal),
          leftNormal: convertVector3fToTree(wall.leftNormal),
          center: convertVector3fToTree(wall.getCenter()),
        };
        wallModels.set(planElement.getId(), wallModel);
      }
    }
    return wallModels;
  }

  private _generateConfigurablePlanObjects(
    planElementManager: PlanElementManager,
    sceneGroup: Group
  ) {
    for (const planObjectMesh of planElementManager.planObjectMeshes) {
      if (planObjectMesh.mesh) {
        this._generateConfigurablePlanObject(sceneGroup, planObjectMesh);
      }
    }
  }

  private async _generateStaticPlanObjects(
    planElementManager: PlanElementManager,
    sceneGroup: Group
  ): Promise<void> {
    const promises: Array<Promise<void>> = [];
    for (const planObjectMesh of planElementManager.planObjectMeshes) {
      if (!planObjectMesh.mesh && planObjectMesh.catalogItem) {
        promises.push(
          this._generateStaticPlanObject(sceneGroup, planObjectMesh)
        );
      }
    }
    await Promise.all(promises);
    this._renderUpdateCallback();
  }

  private _generateConfigurablePlanObject(
    sceneGroup: Group,
    planObjectMesh: PlanObjectMesh
  ) {
    const constructionData = planObjectMesh.mesh as MeshConstructionData;
    const objectData = this._meshFactory.constructThreeMesh(constructionData);
    const threeObject = createSceneGroup(objectData.geometryAndMaterial);
    this._shiftObjectToBottomCenter(planObjectMesh, threeObject);
    this._addObjectToSceneAtObjectPosition(
      sceneGroup,
      planObjectMesh,
      threeObject
    );
  }

  private async _generateStaticPlanObject(
    sceneGroup: Group,
    planObjectMesh: PlanObjectMesh
  ): Promise<void> {
    const catalogItem = planObjectMesh.catalogItem as CatalogItemData;
    const glbUrl = getGlbUrl(catalogItem.item);
    if (!glbUrl || glbUrl === '') {
      return;
    }
    let size = catalogItem.item.scaleable
      ? convertVectorToTree(planObjectMesh.size)
      : undefined;
    let scale = new Vector3(1, 1, 1);
    if (planObjectMesh.planObject.flipX) {
      scale.x *= -1;
    }
    if (planObjectMesh.planObject.flipY) {
      scale.z *= -1;
    }
    const gltf = await this._gltfLoader.loadAsync(glbUrl);
    const gltfScene = handleGLTFScene(
      gltf,
      undefined,
      undefined,
      size,
      scale,
      planObjectMesh.planObject.customColor,
      catalogItem.item.colorable
    );
    if (!gltfScene) {
      return;
    }
    const boxCenter = gltfScene.boundingBox.getCenter(new Vector3());
    gltfScene.scene.position.x -= boxCenter.x;
    gltfScene.scene.position.y -= gltfScene.boundingBox.min.y;
    gltfScene.scene.position.z -= boxCenter.z;
    this._addObjectToSceneAtObjectPosition(
      sceneGroup,
      planObjectMesh,
      gltfScene.scene
    );
  }

  private _shiftObjectToBottomCenter(
    planObjectMesh: PlanObjectMesh,
    threeObject: Group
  ) {
    if (planObjectMesh.boxOfGeometry) {
      const boxOfGeometry = planObjectMesh.boxOfGeometry;
      const bottomCenter = [
        boxOfGeometry.origin.x + boxOfGeometry.size.x / 2,
        boxOfGeometry.origin.y + boxOfGeometry.size.y / 2,
        boxOfGeometry.origin.z,
      ];
      const threeBottomCenter = convertVectorToTree(bottomCenter);
      threeObject.position.x -= threeBottomCenter.x;
      threeObject.position.y -= threeBottomCenter.y;
      threeObject.position.z -= threeBottomCenter.z;
    } else {
      const box = new Box3().setFromObject(threeObject);
      const boxCenter = box.getCenter(new Vector3());
      threeObject.position.x -= boxCenter.x;
      threeObject.position.y -= box.min.y;
      threeObject.position.z -= boxCenter.z;
    }
  }

  private _addObjectToSceneAtObjectPosition(
    sceneGroup: Group,
    planObjectMesh: PlanObjectMesh,
    threeObject: Object3D
  ) {
    const threePositioningGroup = new Group();
    threePositioningGroup.add(threeObject);
    const position = convertVectorToTree(planObjectMesh.position);
    threePositioningGroup.position.copy(position);
    threePositioningGroup.rotation.y = planObjectMesh.rotation;
    sceneGroup.add(threePositioningGroup);
  }

  private _generateMaterialFromCatalogItem(
    planElementManager: PlanElementManager,
    catalogItemId: string
  ): Material | null {
    const catalogItem = planElementManager.getCatalogItem(catalogItemId);
    const rapiItem = catalogItem?.item;
    if (rapiItem?.topImage) {
      const material = new MeshPhysicalMaterial({
        roughness: 0.5,
        metalness: 0.1,
      });
      this._materialFactory.textureLoaderInstance.load(
        rapiItem.topImage,
        (texture) => {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          let scale = new Vector2(1, 1);
          // UV space is in mm and rapi item size is also mm
          if (rapiItem.width && rapiItem.width > 0) {
            scale.x = 1 / rapiItem.width;
          }
          if (rapiItem.depth && rapiItem.depth > 0) {
            scale.y = 1 / rapiItem.depth;
          }
          texture.repeat.set(scale.x, scale.y);
          material.map = texture;
        }
      );
      return material;
    }
    return null;
  }

  private _debugLogPlanElements(planElementManager: PlanElementManager) {
    const catalogItems = planElementManager.catalogItems;
    for (const catalogItem of catalogItems) {
      console.log(`loaded catalog item ${catalogItem.item.id}`);
    }
    const noOfElementsInPlan = planElementManager.planElements.length;
    console.log(`elements in plan ${noOfElementsInPlan}`);
    const noOfObjectsInObjectMap =
      planElementManager.configurationManager.objectMap.size;
    console.log(`objects in object map ${noOfObjectsInObjectMap}`);
    const planMeshes = planElementManager.planMeshes;
    const materials = planElementManager.materials;
    console.log(`plan meshes: ${planMeshes.length}`);
    console.log(`used materials: ${materials.size}`);
  }
}

const LEGACY_ASSET_URL_REG_EX = new RegExp(/\/3d\/[0-9]+\//);

export const getGlbUrl = (item: any): string => {
  // use glb asset without ktx textures as default
  // glb2 used ktx textures
  if (item.assets.glb?.url) {
    return item.assets.glb.url;
  }
  if (item.threeDimensionalAsset) {
    return item.threeDimensionalAsset;
  }
  const assetUrl = item.threeDimensionalAssetWeb;
  if (!assetUrl || typeof assetUrl !== 'string') {
    return '';
  }
  return !assetUrl.match(LEGACY_ASSET_URL_REG_EX)
    ? assetUrl
    : assetUrl
        .replace(LEGACY_ASSET_URL_REG_EX, '/3d/glb/')
        .replace('.flash.u3d', '.glb');
};

interface GLTFScene {
  boundingBox: Box3;
  scene: Object3D;
}

const handleGLTFScene = (
  gltf: any,
  position?: Vector3,
  rotation?: number,
  size?: Vector3,
  scale?: Vector3,
  color?: number,
  colorable?: boolean
): GLTFScene | null => {
  if (
    !gltf ||
    !gltf.scene ||
    !gltf.scene.children ||
    gltf.scene.children.length === 0
  ) {
    return null;
  }

  if (position) {
    gltf.scene.position.copy(position);
  }
  if (rotation) {
    gltf.scene.rotation.y = rotation;
  }
  const boundingBox = new Box3();
  boundingBox.setFromObject(gltf.scene);

  if (size) {
    const { x, y, z } = boundingBox.getSize(new Vector3());
    let calculatedScale = new Vector3(size.x / x, size.y / y, size.z / z);
    gltf.scene.scale.copy(calculatedScale);
  }
  if (scale) {
    gltf.scene.scale.multiply(scale);
  }
  gltf.scene.traverse((node: Object3D) => {
    if (node instanceof Mesh) {
      // set object layer, needed for raycasting
      if (node.material instanceof MeshStandardMaterial) {
        const material = node.material as MeshStandardMaterial;
        if (colorable && color && color > 0) {
          let materialColor = new Color(color);
          material.color = materialColor.copySRGBToLinear(materialColor);
          material.roughness = 0.5;
          material.metalness = 0.1;
        }
        material.needsUpdate = true;
      }
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return { boundingBox, scene: gltf.scene };
};
