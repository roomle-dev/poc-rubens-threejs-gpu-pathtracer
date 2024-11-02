import type {
  MeshConstructionData,
  MaterialProperties,
  MeshSpecification,
  TextureProperties,
} from 'roomle-core-hsc/src/loader/configurationLoader';
import { MeshConstructor } from 'roomle-core-hsc/src/loader/configurationLoader';
import { convertCObject } from 'roomle-core-hsc/src/embind/configuratorUtils';
import { setMaterialProperties } from './map-to-threejs-material';
import type { BufferAttribute, Material, Texture } from 'three';
import {
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  Group,
  Loader,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  RepeatWrapping,
  TangentSpaceNormalMap,
  TextureLoader,
  Uint32BufferAttribute,
  Vector3,
} from 'three';

export interface LoadedConfiguration {
  scene: Group;
}

export class ConfigurationLoader extends Loader {
  public async loadAsync(
    configurationId: string
  ): Promise<LoadedConfiguration> {
    const configuratorMesh: MeshConstructor =
      await MeshConstructor.newMeshConstructor(
        {},
        {
          locateFile(path, prefix) {
            const filePath = (path.endsWith('.wasm') ? './' : prefix) + path;
            console.log('loading file: ' + filePath);
            return filePath;
          },
        }
      );
    const meshConstructionData =
      await configuratorMesh.constructMesh(configurationId);
    const configurationData = new ThreeMeshConstructor(
      configuratorMesh
    ).constructThreeMesh(meshConstructionData);
    return { scene: createSceneGroup(configurationData.geometryAndMaterial) };
  }
}

export interface ConfigurationData {
  geometryAndMaterial: GeometryAndMaterial[];
  materials: MaterialData[];
}

export interface MaterialData {
  materialId: string;
  material: Material;
}

export interface GeometryAndMaterial {
  geometry: BufferGeometry;
  material: Material;
  transform?: Matrix4;
  materialId: string;
  environment: boolean;
}

export const createSceneGroup = (
  geometryAndMaterial: GeometryAndMaterial[]
): Group => {
  const sceneGroup = new Group();
  geometryAndMaterial.forEach((item) => {
    const mesh = new Mesh(item.geometry, item.material);
    if (item.transform) {
      mesh.applyMatrix4(item.transform);
    }
    mesh.castShadow = !item.environment;
    mesh.receiveShadow = true;
    sceneGroup.add(mesh);
  });
  return sceneGroup;
};

export class ThreeMeshConstructor {
  private meshConstructor: MeshConstructor;
  private textureLoader: TextureLoader;

  constructor(meshConstructor: MeshConstructor) {
    this.meshConstructor = meshConstructor;
    this.textureLoader = new TextureLoader();
  }

  public constructThreeMesh(
    meshConstructionData: MeshConstructionData
  ): ConfigurationData {
    const grayMaterial = new MeshLambertMaterial({
      color: 0x808080,
      side: DoubleSide,
    });
    const materialData: MaterialData[] = [];
    const materials = meshConstructionData.materialProperties.map((item) => {
      const material = this.createThreeMaterial(
        item.specification.id,
        item.properties
      );
      material.userData = {
        ...material.userData,
        ...item.properties,
      };
      material.name = item.specification.id;
      materialData.push({
        materialId: item.specification.id,
        material,
      });
      return {
        material,
        properties: item.properties,
        specification: item.specification,
      };
    });
    const geometries = meshConstructionData.meshData.meshes.map(
      (meshSpecification) => {
        const geometry = this.createThreeGeometry(meshSpecification);
        return { geometry, specification: meshSpecification };
      }
    );
    const geometryAndMaterial: GeometryAndMaterial[] = [];
    geometries.forEach((geometryData) => {
      const planComponentData = meshConstructionData.planComponents.find(
        (item: any) => item.id === geometryData.specification.runtimeComponentId
      );
      const globalTransform = this.calculateThreeTransformation(
        planComponentData,
        geometryData.specification
      );
      const materialSpecificationData = materials.find(
        (material) =>
          material.specification.id === geometryData.specification.materialId
      );
      const materialOfGeometry: Material = this.updateMaterialProperties(
        materialSpecificationData?.material ?? grayMaterial,
        geometryData.specification.materialAttributes
      );
      geometryAndMaterial.push({
        geometry: geometryData.geometry,
        material: materialOfGeometry,
        transform: globalTransform,
        materialId: geometryData.specification.materialId,
        environment: geometryData.specification.environmentGeometry,
      });
    });
    return {
      geometryAndMaterial,
      materials: materialData,
    };
  }

  private createThreeMaterial(
    id: string,
    properties: MaterialProperties
  ): Material {
    const material = new MeshPhysicalMaterial();
    const isV2Material = setMaterialProperties(material, properties);
    if (properties.diffuseMap) {
      const setDiffuseTexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.diffuseMap);
        material.map = texture;
      };
      this.loadAndSetTexture(
        setDiffuseTexture,
        properties.diffuseMap.url,
        material.color
      );
      material.transparent = properties.diffuseMapHasAlpha;
      const glow = !isV2Material && id.includes('glow');
      if (properties.diffuseMapHasAlpha && glow) {
        material.emissiveIntensity = 1.0;
        material.emissive = new Color(0xffffff);
        material.emissiveMap = material.map;
      }
    }
    if (properties.normalMap) {
      const setNormalTexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.normalMap);
        material.normalMap = texture;
        material.normalMapType = TangentSpaceNormalMap;
      };
      this.loadAndSetTexture(setNormalTexture, properties.normalMap.url);
    }
    if (properties.ormMap) {
      const setORMTexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.ormMap);
        material.aoMap = texture;
        material.roughnessMap = texture;
        material.metalnessMap = texture;
      };
      this.loadAndSetTexture(setORMTexture, properties.ormMap.url);
    }

    // TODO: to be set in _setMaterialV2Properties?
    if (properties.shading.transmissionIOR !== undefined) {
      material.ior = 1 + properties.shading.transmissionIOR;
    }

    material.envMapIntensity = 2;
    return material;
  }

  private updateMaterialProperties(
    material: Material,
    materialAttributes: Record<string, string> | null
  ) {
    if (
      materialAttributes &&
      Object.keys(materialAttributes).length > 0 &&
      material instanceof MeshStandardMaterial
    ) {
      const newMaterial = material.clone();
      newMaterial.userData.materialAttributes = materialAttributes;
      this._updateStandardMaterialProperties(newMaterial, materialAttributes);
      if (newMaterial instanceof MeshPhysicalMaterial) {
        this._updatePhysicalMaterialProperties(newMaterial, materialAttributes);
      }
      newMaterial.transparent = newMaterial.opacity < 1;
      return newMaterial;
    }
    return material;
  }

  private _updateStandardMaterialProperties(
    material: MeshStandardMaterial,
    materialAttributes: Record<string, string>
  ) {
    if (materialAttributes.color) {
      material.color = new Color(materialAttributes.color);
    }
    if (materialAttributes.alpha) {
      material.opacity = parseFloat(materialAttributes.alpha);
    }
    if (materialAttributes.roughness) {
      material.roughness = parseFloat(materialAttributes.roughness);
    }
    if (materialAttributes.metallic) {
      material.metalness = parseFloat(materialAttributes.metallic);
    }
    if (materialAttributes.alphaCutoff) {
      material.alphaTest = parseFloat(materialAttributes.alphaCutoff);
    }
    if (materialAttributes.doubleSided) {
      material.side = materialAttributes.doubleSided ? DoubleSide : FrontSide;
    }
    if (materialAttributes.occlusion) {
      material.aoMapIntensity = parseFloat(materialAttributes.occlusion);
    }
    if (materialAttributes.emissiveColor) {
      material.emissive = new Color(materialAttributes.emissiveColor);
    }
    if (materialAttributes.emissiveIntensity) {
      material.emissiveIntensity = parseFloat(
        materialAttributes.emissiveIntensity
      );
    }
  }

  private _updatePhysicalMaterialProperties(
    material: MeshPhysicalMaterial,
    materialAttributes: Record<string, string>
  ) {
    if (materialAttributes.transmission) {
      material.transmission = parseFloat(materialAttributes.transmission);
    }
    if (materialAttributes.specularColor) {
      material.specularColor = new Color(materialAttributes.specularColor);
    }
    if (materialAttributes.specularity) {
      material.specularIntensity = parseFloat(materialAttributes.specularity);
    }
    if (materialAttributes.clearcoatIntensity) {
      material.clearcoat = parseFloat(materialAttributes.clearcoatIntensity);
    }
    if (materialAttributes.clearcoatRoughness) {
      material.clearcoatRoughness = parseFloat(
        materialAttributes.clearcoatRoughness
      );
    }
    if (materialAttributes.clearcoatNormalScale) {
      material.clearcoatNormalScale.setScalar(
        parseFloat(materialAttributes.clearcoatNormalScale)
      );
    }
    if (materialAttributes.sheenColor) {
      material.sheenColor = new Color(materialAttributes.sheenColor);
    }
    if (materialAttributes.sheenIntensity) {
      material.sheen = parseFloat(materialAttributes.sheenIntensity);
    }
    if (materialAttributes.sheenRoughness) {
      material.sheenRoughness = parseFloat(materialAttributes.sheenRoughness);
    }
    if (materialAttributes.thicknessFactor) {
      material.thickness = parseFloat(materialAttributes.thicknessFactor);
    }
    if (materialAttributes.attenuationColor) {
      material.attenuationColor = new Color(
        materialAttributes.attenuationColor
      );
    }
    if (materialAttributes.attenuationDistance) {
      material.attenuationDistance = parseFloat(
        materialAttributes.attenuationDistance
      );
    }
  }

  private createThreeGeometry(
    meshSpecification: MeshSpecification
  ): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setIndex(new Uint32BufferAttribute(meshSpecification.indices, 1));
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(meshSpecification.vertices, 3)
    );
    geometry.setAttribute(
      'normal',
      new Float32BufferAttribute(meshSpecification.normals, 3)
    );
    geometry.setAttribute(
      'uv',
      new Float32BufferAttribute(meshSpecification.uvCoords, 2)
    );
    geometry.scale(1 / 1000, 1 / 1000, 1 / 1000);
    geometry.rotateX(-Math.PI / 2);
    if (
      geometry.attributes.uv &&
      meshSpecification.uvTransform &&
      !this.meshConstructor.isUVIdentityMatrix(meshSpecification.uvTransform)
    ) {
      const uvTransformMatrix = convertToThreeUVMatrix(
        meshSpecification.uvTransform
      );
      (geometry.attributes.uv as BufferAttribute).applyMatrix4(
        uvTransformMatrix
      );
    }
    return geometry;
  }

  private setTextureProperties(
    texture: Texture,
    textureProperties?: TextureProperties
  ): void {
    texture.anisotropy = 16;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    if (textureProperties) {
      const textureWidth =
        textureProperties.mmWidth === 0 ? 1000 : textureProperties.mmWidth;
      const textureHeight =
        textureProperties.mmHeight === 0 ? 1000 : textureProperties.mmHeight;
      texture.repeat.set(1 / textureWidth, 1 / textureHeight);
    }
  }

  private calculateThreeTransformation(
    planComponentData: any,
    meshSpecification: MeshSpecification
  ): Matrix4 {
    let globalTransform = new Matrix4();
    if (planComponentData) {
      const floatBuffer = new Float32Array(
        planComponentData.planComponent.globalTransform.m
      );
      globalTransform = convertToThreeMatrix(floatBuffer);
    }
    if (meshSpecification.transform) {
      const transform = convertToThreeMatrix(meshSpecification.transform);
      globalTransform.multiply(transform);
    }
    return globalTransform;
  }

  private loadAndSetTexture(
    setTexture: (texture: Texture) => void,
    resource: string,
    color?: Color
  ): void {
    if (color) {
      setTexture(this.createUniformColorTexture(color));
    }
    if (resource) {
      this.textureLoader.load(resource, setTexture);
    }
  }

  private createUniformColorTexture(color: Color): Texture {
    const colorTextureData = new Uint8Array([
      Math.floor(color.r * 255),
      Math.floor(color.g * 255),
      Math.floor(color.b * 255),
      255,
    ]);
    const colorTexture = new DataTexture(colorTextureData, 1, 1);
    colorTexture.needsUpdate = true;
    return colorTexture;
  }
}

export const convertKernelMatrixCoordsToThree = (matrix: Matrix4): Matrix4 => {
  const a = new Matrix4();
  a.set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);
  a.scale(new Vector3(1 / 1000, 1 / 1000, 1 / 1000));
  const b = new Matrix4();
  b.set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  b.scale(new Vector3(1000, 1000, 1000));
  return a.multiply(matrix).multiply(b);
};

export const convertToThreeMatrix = (transform: Float32Array): Matrix4 => {
  const transformMatrix = new Matrix4();
  const transformArray: number[] = convertCObject(transform);
  transformMatrix.fromArray(transformArray);
  transformMatrix.transpose();

  return convertKernelMatrixCoordsToThree(transformMatrix);
};

/*
export const convertToThreeMatrix = (transform: Float32Array): Matrix4 => {
    let transformMatrix = new Matrix4();
    let transformArray: number[] = convertCObject(transform);
    transformMatrix.fromArray(transformArray);
    transformMatrix.transpose();
    return transformMatrix;
};
*/

export const convertToThreeUVMatrix = (transform: Float32Array): Matrix4 => {
  const uvTransformMatrix = new Matrix4();
  uvTransformMatrix.set(
    transform[0],
    transform[2],
    0,
    transform[4],
    transform[1],
    transform[3],
    0,
    transform[5],
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  );
  return uvTransformMatrix;
};
