import { SceneCache } from './roomle-threejs-loader/src/scene/scene-cache';
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  EquirectangularReflectionMapping,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import Stats from 'three/examples/jsm/libs/stats.module';
//import { GUI } from 'dat.gui';
// @ts-ignore
import { ParallelMeshBVHWorker } from 'three-mesh-bvh/src/workers/ParallelMeshBVHWorker.js';
import { WebGLPathTracer } from 'three-gpu-pathtracer/src';

const ENV_URL =
  //'https://raw.githubusercontent.com/roomle/Roomle_Assets/refs/heads/main/Bathroom_Ring_Tunnel.exr';
  'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/chinese_garden_1k.hdr';

const getScaledSettings = () => {
  let tiles = 3;
  let renderScale = Math.max(1 / window.devicePixelRatio, 0.5);

  // adjust performance parameters for mobile
  const aspectRatio = window.innerWidth / window.innerHeight;
  if (aspectRatio < 0.65) {
    tiles = 4;
    renderScale = 0.5 / window.devicePixelRatio;
  }

  return { tiles, renderScale };
};

export const configurationRenderer = (
  canvas: HTMLCanvasElement,
  parameterId?: string
) => {
  const renderer = new WebGLRenderer({
    canvas,
    //antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('./draco/');
  dracoLoader.setDecoderConfig({ type: 'js' });
  const sceneCache = new SceneCache(dracoLoader);

  const { tiles, renderScale } = getScaledSettings();
  console.log('tiles', tiles);
  console.log('renderScale', renderScale);
  const pathTracer = new WebGLPathTracer(renderer);
  pathTracer.filterGlossyFactor = 0.5;
  pathTracer.renderScale = renderScale;
  pathTracer.tiles.set(tiles, tiles);

  pathTracer.setBVHWorker(new ParallelMeshBVHWorker());

  const camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    20
  );
  camera.position.set(-2, 2, 3);
  camera.updateMatrixWorld();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.addEventListener('change', () => pathTracer.updateCamera());
  controls.update();

  const exrLoader = new EXRLoader();
  const rgbeLoader = new RGBELoader();
  const scene = new Scene();
  scene.background = new Color(0xffffff);

  const groundGeometry = new PlaneGeometry(10, 10);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.7,
    roughness: 0.5,
  });
  const groundMesh = new Mesh(groundGeometry, groundMaterial);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const meshGroup = new Group();
  scene.add(meshGroup);
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshPhysicalMaterial({
    color: 0xe02020,
  });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 0.5;
  meshGroup.add(mesh);
  const meshTransformControl = new TransformControls(
    camera,
    renderer.domElement
  );
  meshTransformControl.addEventListener('dragging-changed', (event: any) => {
    controls.enabled = !event.value;
  });
  meshTransformControl.attach(meshGroup);
  meshTransformControl.getHelper().visible = false;
  meshTransformControl.enabled = false;
  scene.add(meshTransformControl.getHelper());

  const stats = new Stats();
  document.body.appendChild(stats.dom);
  //const gui = new GUI();

  window.addEventListener(
    'resize',
    () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      pathTracer.updateCamera();
    },
    false
  );

  const loadScene = async (idOrUrl: string) => {
    let loadedScene = sceneCache.getScene(idOrUrl);
    if (!loadedScene) {
      setStatus(`load ${idOrUrl}`, '#ff0000');
      loadedScene = await sceneCache.loadSceneFromId(idOrUrl);
    }
    setStatus(`render ${idOrUrl}`, '#ff0000');
    meshGroup.clear();
    meshGroup.add(loadedScene.sceneObject);
    setStatus(`${idOrUrl}`);
  };

  const loadExr = async (resource: string) => {
    const equirectTexture = await exrLoader.loadAsync(resource);
    equirectTexture.mapping = EquirectangularReflectionMapping;
    scene.background = equirectTexture;
    scene.environment = equirectTexture;
  };

  const loadHdr = async (resource: string) => {
    const equirectTexture = await rgbeLoader.loadAsync(resource);
    equirectTexture.mapping = EquirectangularReflectionMapping;
    scene.background = equirectTexture;
    scene.environment = equirectTexture;
  };

  const render = () => {
    //renderer.render(scene, camera);
    pathTracer.renderSample();
    setStatus(
      `samples ${Math.floor(pathTracer.samples)}`,
      '#000000',
      'status-line-2'
    );
  };

  const animate = (_timestamp: number) => {
    render();
    requestAnimationFrame(animate);
    stats.update();
  };

  const startRendering = async () => {
    if (parameterId) {
      const environmentUrl = envUrl ?? ENV_URL;
      const environmentToLower = environmentUrl.toLowerCase();
      if (environmentToLower.endsWith('.hdr')) {
        await loadHdr(environmentUrl);
      } else if (environmentToLower.endsWith('.exr')) {
        await loadExr(environmentUrl);
      }
      await loadScene(parameterId);
      await pathTracer.setSceneAsync(scene, camera, {
        onProgress: (v: any) =>
          setStatus(
            `loading scene ${Math.floor(v * 100)}%`,
            '#000000',
            'status-line-2'
          ),
      });
    }
    requestAnimationFrame(animate);
  };

  void startRendering();
};

const setStatus = (
  message: string,
  color: string = '#000000',
  id = 'status-line-1'
) => {
  console.log(`Status information: ${message}`);
  const statusLine = document.getElementById(id);
  if (!statusLine) {
    return;
  }
  statusLine.innerText = message;
  statusLine.style.setProperty('color', color);
};

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let parameterId = urlParams.get('id') as string | undefined;
if (!parameterId) {
  parameterId =
    'usm:frame:9C4BC73D19BAAD07675CDDEA721F493BB126939392FF80318204B089BD55C71A';
}
if (parameterId) {
  console.log(`id: ${parameterId}`);
}
let envUrl = urlParams.get('envUrl') as string | undefined;
if (envUrl) {
  console.log(`envUrl: ${envUrl}`);
}

const threeCanvas = document.getElementById('three_canvas');
if (threeCanvas === null) {
  throw new Error('three_canvas not found');
}
configurationRenderer(threeCanvas as HTMLCanvasElement, parameterId);
