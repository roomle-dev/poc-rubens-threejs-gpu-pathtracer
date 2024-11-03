import type {
  MaterialProperties,
  RapiBaseColor,
  TextureProperties,
} from 'roomle-core-hsc/src/loader/loaderUtility';
import type { Material, Texture } from 'three';
import {
  DataTexture,
  MeshPhysicalMaterial,
  RepeatWrapping,
  TangentSpaceNormalMap,
  TextureLoader,
} from 'three';
import { Color, DoubleSide, FrontSide } from 'three';

export const getValue = (value: any, defaultValue: any): any => {
  if (value === undefined) {
    return defaultValue;
  }
  return value;
};

export class ThreeMaterialFactory {
  private textureLoader: TextureLoader;

  constructor() {
    this.textureLoader = new TextureLoader();
  }

  get textureLoaderInstance(): TextureLoader {
    return this.textureLoader;
  }

  public createThreeMaterial(
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
    if (properties.emrgbMap) {
      const setEmissiveTexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.emrgbMap);
        material.emissiveMap = texture;
      };
      this.loadAndSetTexture(setEmissiveTexture, properties.emrgbMap.url);
    }
    if (properties.ccrgMap) {
      const setCCRGTexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.ccrgMap);
        material.clearcoatRoughnessMap = texture;
      };
      this.loadAndSetTexture(setCCRGTexture, properties.ccrgMap.url);
    }
    if (properties.ccxyzMap) {
      const setCCXYZTexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.ccxyzMap);
        material.clearcoatNormalMap = texture;
      };
      this.loadAndSetTexture(setCCXYZTexture, properties.ccxyzMap.url);
    }
    if (properties.shrgbaMap) {
      const setSHRGBATexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.shrgbaMap);
        material.sheenRoughnessMap = texture;
      };
      this.loadAndSetTexture(setSHRGBATexture, properties.shrgbaMap.url);
    }
    if (properties.sprgbaMap) {
      const setSPRGBATexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.sprgbaMap);
        material.sheenColorMap = texture;
      };
      this.loadAndSetTexture(setSPRGBATexture, properties.sprgbaMap.url);
    }
    if (properties.ttrgMap) {
      const setTTRGTexture = (texture: Texture) => {
        this.setTextureProperties(texture, properties.ttrgMap);
        material.thicknessMap = texture;
        material.transmissionMap = texture;
      };
      this.loadAndSetTexture(setTTRGTexture, properties.ttrgMap.url);
    }
    if (properties.shading.transmissionIOR !== undefined) {
      material.ior = 1 + properties.shading.transmissionIOR;
    }

    material.envMapIntensity = 2;
    return material;
  }

  private setTextureProperties(
    texture: Texture,
    textureProperties?: TextureProperties
  ): void {
    texture.anisotropy = 16;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    if (textureProperties) {
      let textureWidth =
        textureProperties.mmWidth === 0 ? 1000 : textureProperties.mmWidth;
      let textureHeight =
        textureProperties.mmHeight === 0 ? 1000 : textureProperties.mmHeight;
      texture.repeat.set(1 / textureWidth, 1 / textureHeight);
    }
  }

  private async loadAndSetTexture(
    setTexture: (texture: Texture) => void,
    resource: string,
    color?: Color
  ): Promise<void> {
    if (color) {
      setTexture(this.createUniformColorTexture(color));
    }
    if (resource) {
      const texture = await this.textureLoader.loadAsync(resource);
      setTexture(texture);
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

export const setMaterialProperties = (
  meshPhysicalMaterial: MeshPhysicalMaterial,
  rapiMaterial: MaterialProperties
): boolean => {
  const isV2Material =
    rapiMaterial.shading.version === '2' ||
    rapiMaterial.shading.version?.startsWith('2.');
  meshPhysicalMaterial = isV2Material
    ? _setMaterialV2Properties(meshPhysicalMaterial, rapiMaterial)
    : _setMaterialV1Properties(meshPhysicalMaterial, rapiMaterial);
  return isV2Material ?? false;
};

const _setMaterialV1Properties = (
  meshPhysicalMaterial: MeshPhysicalMaterial,
  rapiMaterial: MaterialProperties
): MeshPhysicalMaterial => {
  if (rapiMaterial.shading.metallic !== undefined) {
    meshPhysicalMaterial.metalness =
      rapiMaterial.shading.metallic === 1 ? 1 : 0.5;
    meshPhysicalMaterial.reflectivity = getValue(
      rapiMaterial.shading.metallic,
      0.5
    ); //three.js default is 0.5
  }

  let forceDoubleSide = false; // for backwards compatibility
  if (
    rapiMaterial.shading.transmission &&
    rapiMaterial.shading.transmission > 0
  ) {
    // disabled transmission compatibility mode to improve performance and be compatible with pixotronics renderer
    // meshPhysicalMaterial.transmission = rapiMaterial.shading.transmission;
    meshPhysicalMaterial.opacity = 1 - rapiMaterial.shading.transmission;
    meshPhysicalMaterial.transparent = true;
    meshPhysicalMaterial.depthWrite = false;
    meshPhysicalMaterial.metalness = 0;
    forceDoubleSide = true;
  } else if (
    rapiMaterial.shading.alpha !== undefined &&
    rapiMaterial.shading.alpha < 1
  ) {
    meshPhysicalMaterial.transparent = rapiMaterial.shading.alpha < 1;
    meshPhysicalMaterial.opacity = rapiMaterial.shading.alpha;
    meshPhysicalMaterial.depthWrite = rapiMaterial.shading.alpha >= 1;
    // modulate metalness with alpha channel for backwards compatibility
    meshPhysicalMaterial.metalness =
      0.5 * Math.max(0, rapiMaterial.shading.alpha);
    forceDoubleSide = true;
  }

  meshPhysicalMaterial.aoMapIntensity = getValue(
    rapiMaterial.shading.occlusion,
    1
  );
  meshPhysicalMaterial.roughness = getValue(
    rapiMaterial.shading.roughness,
    0.5
  ); //three.js default is 0.5
  meshPhysicalMaterial.alphaTest = getValue(
    rapiMaterial.shading.alphaCutoff,
    0
  );

  _setColor(meshPhysicalMaterial.color, rapiMaterial.shading.basecolor);
  if (forceDoubleSide || rapiMaterial.shading.doubleSided) {
    meshPhysicalMaterial.side = DoubleSide;
  } else {
    meshPhysicalMaterial.side = FrontSide;
  }
  return meshPhysicalMaterial;
};

// To fulfill the "eslint" complexity rule, we would have to split this function into at least 3 functions.
// This is pointless, as this function does exactly one thing, namely map "RapiMaterial" to "MeshPhysicalMaterial".

const _setMaterialV2Properties = (
  meshPhysicalMaterial: MeshPhysicalMaterial,
  rapiMaterial: MaterialProperties
): MeshPhysicalMaterial => {
  let forceDoubleSide = false; // for backwards compatibility
  if (
    rapiMaterial.shading.alpha !== undefined &&
    rapiMaterial.shading.alpha < 1
  ) {
    meshPhysicalMaterial.transparent = true;
    meshPhysicalMaterial.opacity = rapiMaterial.shading.alpha;
    meshPhysicalMaterial.depthWrite = false;
    forceDoubleSide = true;
  } else {
    meshPhysicalMaterial.transparent = false;
    meshPhysicalMaterial.opacity = 1;
    meshPhysicalMaterial.depthWrite = true;
  }
  meshPhysicalMaterial.alphaTest = rapiMaterial.shading.alphaCutoff ?? 0;
  _setColor(meshPhysicalMaterial.color, rapiMaterial.shading.basecolor);
  meshPhysicalMaterial.transmission = rapiMaterial.shading.transmission ?? 0;
  meshPhysicalMaterial.metalness = rapiMaterial.shading.metallic ?? 0;
  _setColor(
    meshPhysicalMaterial.specularColor,
    rapiMaterial.shading.specularColor
  );
  meshPhysicalMaterial.specularIntensity =
    rapiMaterial.shading.specularity ?? 0;
  meshPhysicalMaterial.roughness = rapiMaterial.shading.roughness ?? 0;
  meshPhysicalMaterial.aoMapIntensity = rapiMaterial.shading.occlusion ?? 1;
  _setColor(meshPhysicalMaterial.emissive, rapiMaterial.shading.emissiveColor);
  meshPhysicalMaterial.emissiveIntensity =
    rapiMaterial.shading.emissiveIntensity ?? 1;
  meshPhysicalMaterial.clearcoat = rapiMaterial.shading.clearcoatIntensity ?? 0;
  meshPhysicalMaterial.clearcoatRoughness =
    rapiMaterial.shading.clearcoatRoughness ?? 0;
  meshPhysicalMaterial.clearcoatNormalScale.setScalar(
    rapiMaterial.shading.clearcoatNormalScale ?? 1
  );
  _setColor(meshPhysicalMaterial.sheenColor, rapiMaterial.shading.sheenColor);
  meshPhysicalMaterial.sheen = rapiMaterial.shading.sheenIntensity ?? 1;
  meshPhysicalMaterial.sheenRoughness =
    rapiMaterial.shading.sheenRoughness ?? 1;
  meshPhysicalMaterial.thickness = rapiMaterial.shading.thicknessFactor ?? 0;
  _setColor(
    meshPhysicalMaterial.attenuationColor,
    rapiMaterial.shading.attenuationColor
  );
  if (rapiMaterial.shading.attenuationDistance) {
    meshPhysicalMaterial.attenuationDistance =
      rapiMaterial.shading.attenuationDistance;
  }
  meshPhysicalMaterial.side =
    forceDoubleSide || rapiMaterial.shading.doubleSided
      ? DoubleSide
      : FrontSide;

  return meshPhysicalMaterial;
};

const _setColor = (meshColor: Color, rapiColor?: RapiBaseColor) => {
  if (rapiColor !== undefined) {
    const color = new Color(rapiColor.r, rapiColor.g, rapiColor.b);
    meshColor.copy(color.convertSRGBToLinear());
  }
};
