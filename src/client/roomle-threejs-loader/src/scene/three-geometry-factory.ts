import type { Vector3f } from 'roomle-core-hsc/src/embind/configuratorCoreInterface';
import { convertCObject } from 'roomle-core-hsc/src/embind/configuratorUtils';
import type { GeometrySpecification } from 'roomle-core-hsc/src/loader/configurationLoader';
import { isUVIdentityMatrix } from 'roomle-core-hsc/src/loader/loaderUtility';
import type { BufferAttribute } from 'three';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Uint32BufferAttribute,
  Vector3,
} from 'three';

export class ThreeGeometryFactory {
  public createThreeGeometry(
    meshSpecification: GeometrySpecification
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
      !isUVIdentityMatrix(meshSpecification.uvTransform)
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
}

export const convertVectorToTree = (vector: number[]): Vector3 => {
  return new Vector3(vector[0] / 1000, vector[2] / 1000, vector[1] / -1000);
};

export const convertVector3fToTree = (vector: Vector3f): Vector3 => {
  return new Vector3(vector.x / 1000, vector.z / 1000, vector.y / -1000);
};

export const convertKernelMatrixCoordsToThree = (matrix: Matrix4): Matrix4 => {
  let a = new Matrix4();
  a.set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);
  a.scale(new Vector3(1 / 1000, 1 / 1000, 1 / 1000));
  let b = new Matrix4();
  b.set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  b.scale(new Vector3(1000, 1000, 1000));
  return a.multiply(matrix).multiply(b);
};

export const convertToThreeMatrix = (transform: Float32Array): Matrix4 => {
  let transformMatrix = new Matrix4();
  let transformArray: number[] = convertCObject(transform);
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
