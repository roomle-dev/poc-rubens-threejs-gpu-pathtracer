import {
  CORE_WALL_TYPE,
  type WallType,
} from 'roomle-core-hsc/src/embind/plannerCoreInterface';
import type { Camera, Vector3 } from 'three';

export interface WallMode {
  wallType: WallType;
  rightNormal: Vector3;
  leftNormal: Vector3;
  center: Vector3;
}

export const isWallVisibleBasedOnCamera = (
  camera: Camera,
  wallModel: WallMode
): boolean => {
  let wallNormal;
  if (wallModel.wallType.value === CORE_WALL_TYPE.OUTERWALLRIGHT) {
    wallNormal = wallModel.rightNormal.clone();
  }
  if (wallModel.wallType.value === CORE_WALL_TYPE.OUTERWALLLEFT) {
    wallNormal = wallModel.leftNormal.clone();
  }
  let visible = true;
  if (wallNormal) {
    const wallCenter = wallModel.center
      .clone()
      .applyMatrix4(camera.matrixWorldInverse);
    wallNormal = wallNormal.transformDirection(camera.matrixWorldInverse);
    const cameraDirection = wallCenter;
    const dotProduct = cameraDirection.dot(wallNormal);
    visible = dotProduct >= 0;
  }
  return visible;
};
