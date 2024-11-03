import type { MeshSpecification } from 'roomle-core-hsc/src/loader/configurationLoader';
import { ThreeGeometryFactory } from './three-geometry-factory';
import { ThreeMaterialFactory } from './three-material-factory';
import type { MeshConstructionData } from 'roomle-core-hsc/src/loader/loaderUtility';
import { convertToThreeMatrix } from './three-geometry-factory';
import type { BufferGeometry, Material } from 'three';
import {
  Color,
  DoubleSide,
  FrontSide,
  Group,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three';

export interface LoadedScene {
  scene: Group;
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

export interface SceneData {
  geometryAndMaterial: GeometryAndMaterial[];
  materials: MaterialData[];
}

export class ThreeConfiguratorMeshFactory {
  private _materialFactory: ThreeMaterialFactory;
  private _geometryFactory: ThreeGeometryFactory;

  constructor(
    materialFactory?: ThreeMaterialFactory,
    geometryFactory?: ThreeGeometryFactory
  ) {
    this._materialFactory = materialFactory ?? new ThreeMaterialFactory();
    this._geometryFactory = geometryFactory ?? new ThreeGeometryFactory();
  }

  public constructThreeMesh(
    meshConstructionData: MeshConstructionData
  ): SceneData {
    const grayMaterial = new MeshLambertMaterial({
      color: 0x808080,
      side: DoubleSide,
    });
    const materialData: MaterialData[] = [];
    const materials = meshConstructionData.materialProperties.map((item) => {
      const material = this._materialFactory.createThreeMaterial(
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
        const geometry =
          this._geometryFactory.createThreeGeometry(meshSpecification);
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

  private updateMaterialProperties(
    material: Material,
    materialAttributes: Record<string, string> | null
  ) {
    if (
      materialAttributes &&
      Object.keys(materialAttributes).length > 0 &&
      material instanceof MeshStandardMaterial
    ) {
      const newMaterial = (material as MeshStandardMaterial).clone();
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
    if (materialAttributes.normalScale) {
      material.normalScale.setScalar(
        parseFloat(materialAttributes.normalScale)
      );
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
}
