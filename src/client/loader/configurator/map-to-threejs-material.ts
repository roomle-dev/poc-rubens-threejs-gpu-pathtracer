import type {
  MaterialProperties,
  RapiBaseColor,
} from 'roomle-core-hsc/src/loader/configurationLoader';
import type { MeshPhysicalMaterial } from 'three';
import { Color, DoubleSide, FrontSide } from 'three';

export const getValue = (value: any, defaultValue: any): any => {
  if (value === undefined) {
    return defaultValue;
  }
  return value;
};

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
// eslint-disable-next-line complexity
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
