import { ConfigurationLoader } from './loader/configurator/configurationLoader';
import type { Object3D } from 'three';
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
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import Stats from 'three/examples/jsm/libs/stats.module';
//import { GUI } from 'dat.gui';
// @ts-ignore
import { ParallelMeshBVHWorker } from 'three-mesh-bvh/src/workers/ParallelMeshBVHWorker.js';
// @ts-ignore
import { WebGLPathTracer } from 'three-gpu-pathtracer/src/core/WebGLPathTracer.js';

const ENV_URL =
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const { tiles, renderScale } = getScaledSettings();
  console.log('tiles', tiles);
  console.log('renderScale', renderScale);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const pathTracer = new WebGLPathTracer(renderer);
  pathTracer.filterGlossyFactor = 0.5;
  pathTracer.renderScale = renderScale;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  pathTracer.tiles.set(tiles, tiles);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  controls.addEventListener('change', () => pathTracer.updateCamera());
  controls.update();

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
  meshTransformControl.visible = false;
  meshTransformControl.enabled = false;
  scene.add(meshTransformControl);

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      pathTracer.updateCamera();
    },
    false
  );

  const sceneCache: Map<string, Object3D> = new Map();
  const loadConfiguratorMesh = async (configurationId: string) => {
    let loadedScene = sceneCache.get(configurationId);
    if (!loadedScene) {
      setStatus(`load ${configurationId}`, '#ff0000');
      const configurationLoader = new ConfigurationLoader();
      loadedScene = (await configurationLoader.loadAsync(configurationId))
        .scene;
      sceneCache.set(configurationId, loadedScene);
    }
    setStatus(`render ${configurationId}`, '#ff0000');
    meshGroup.clear();
    meshGroup.add(loadedScene);
    setStatus(`${configurationId}`);
  };

  const loadHdr = async (resource: string) => {
    const equirectTexture = await rgbeLoader.loadAsync(resource);
    equirectTexture.mapping = EquirectangularReflectionMapping;
    scene.background = equirectTexture;
    scene.environment = equirectTexture;
  };

  const render = () => {
    //renderer.render(scene, camera);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    pathTracer.renderSample();
    setStatus(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
      await loadHdr(ENV_URL);
      await loadConfiguratorMesh(parameterId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
const parameterId = urlParams.get('id') as string | undefined;
if (parameterId) {
  console.log(`id: ${parameterId}`);
}

const threeCanvas = document.getElementById('three_canvas');
if (threeCanvas === null) {
  throw new Error('three_canvas not found');
}
configurationRenderer(threeCanvas as HTMLCanvasElement, parameterId);
