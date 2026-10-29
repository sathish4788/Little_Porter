import * as THREE from 'three';
import { TaskStage } from '../types/game';

export class WorldScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private isSoftwareGl: boolean = false;
  private animFrameId: number = 0;
  private clock: THREE.Clock;

  // Camera targets
  private targetCamPos = new THREE.Vector3(-25, 9, 18);
  private currentCamPos = new THREE.Vector3(-25, 9, 18);
  private targetLookAt = new THREE.Vector3(-22, 2, 6);
  private currentLookAt = new THREE.Vector3(-22, 2, 6);

  // Animated elements
  private clouds: THREE.Group[] = [];
  private waterPlane: THREE.Mesh | null = null;
  private godownCratesGroup: THREE.Group | null = null;
  private truckGroup: THREE.Group | null = null;
  private truckCargoGroup: THREE.Group | null = null;
  private truckWheels: THREE.Mesh[] = [];
  private trainGroup: THREE.Group | null = null;
  private trainCargoGroup: THREE.Group | null = null;
  private trainWheels: THREE.Mesh[] = [];
  private forkliftGroup: THREE.Group | null = null;
  private forkliftWheels: THREE.Mesh[] = [];
  private forkliftCargoGroup: THREE.Group | null = null;
  private yardContainerGroup: THREE.Group | null = null;
  private craneTrolley: THREE.Group | null = null;
  private craneSpreader: THREE.Group | null = null;
  private craneHeldContainer: THREE.Mesh | null = null;
  private shipGroup: THREE.Group | null = null;
  private shipContainersGroup: THREE.Group | null = null;
  private lighthouseBeam: THREE.Mesh | null = null;
  private chimneySmoke: THREE.Mesh[] = [];

  // Active Loading Process Animation State
  private activeProcessStage: TaskStage | null = null;
  private processElapsed: number = 0;
  private processDuration: number = 6.0; // 6s of smooth, realistic logistics animation
  private onProcessProgressCb?: (msg: string, percent: number) => void;
  private onProcessArrivalCb?: () => void;

  // Baseline transform constants (Straight alignment on road z = 6, rails z = 1)
  private readonly ROAD_Z = 6.0;
  private readonly RAIL_Z = 1.0;
  private readonly GODOWN_TRUCK_X = -21.0;
  private readonly STATION_TRUCK_X = -4.0;
  private readonly STATION_TRAIN_X = -4.0;
  private readonly YARD_TRAIN_X = 14.0;
  private readonly FORKLIFT_HOME_X = 14.0;
  private readonly FORKLIFT_CONTAINER_X = 18.2;

  // Ship departure state
  private isShipDeparting: boolean = false;
  private shipBobTime: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc); // Calm cheerful sky
    this.scene.fog = new THREE.Fog(0x7dd3fc, 50, 160);

    // 3. Camera with 0.5 near-plane for rock-solid 24-bit depth precision (no Z-fighting)
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 220);
    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);

    // 4. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Build the 3D World in order of the shipment chain
    this.setupLighting();
    this.buildTerrain();
    this.buildClouds();
    this.buildGodownZone(); // Step 1: Godown to Truck
    this.buildRailwayStationZone(); // Step 2: Railway Station (Truck to Train)
    this.buildFreightYardZone(); // Step 3: Freight Yard (Train to Container via Forklift)
    this.buildHarborZone(); // Step 4: Harbor Crane to Ship
    this.buildLighthouse();
    this.buildDecorations();

    this.startLoop();
    window.addEventListener('resize', this.onResize);
  }

  private setupLighting() {
    const sunLight = new THREE.DirectionalLight(0xfff8eb, 1.85);
    sunLight.position.set(35, 48, 28);
    if (!this.isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 130;
      sunLight.shadow.camera.left = -50;
      sunLight.shadow.camera.right = 50;
      sunLight.shadow.camera.top = 30;
      sunLight.shadow.camera.bottom = -30;
      sunLight.shadow.bias = -0.0003;
      sunLight.shadow.normalBias = 0.03;
    }
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x86efac, 0.85);
    this.scene.add(hemiLight);

    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(amb);
  }

  private buildTerrain() {
    // Mainland ground
    const mainlandGeo = new THREE.BoxGeometry(66, 4, 38);
    const mainlandMat = new THREE.MeshStandardMaterial({
      color: 0x86efac, // Bright green grass
      roughness: 0.85,
    });
    const mainland = new THREE.Mesh(mainlandGeo, mainlandMat);
    mainland.position.set(-10, -2, 0);
    mainland.receiveShadow = !this.isSoftwareGl;
    this.scene.add(mainland);

    // STRAIGHT Roadway from Godown to Railway Station (z = 6)
    const roadGeo = new THREE.BoxGeometry(50, 0.1, 4.4);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Clean dark asphalt
      roughness: 0.8,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(-10, 0.05, this.ROAD_Z);
    road.receiveShadow = !this.isSoftwareGl;
    this.scene.add(road);

    // White dashed center line on road (separated in Y to prevent any flickering)
    for (let rx = -32; rx <= 12; rx += 3.5) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.02, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      );
      dash.position.set(rx, 0.11, this.ROAD_Z);
      this.scene.add(dash);
    }

    // Concrete apron at Godown connecting warehouse loading dock to road
    const godownApron = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 })
    );
    godownApron.position.set(-32, 0.04, 3.0);
    godownApron.receiveShadow = !this.isSoftwareGl;
    this.scene.add(godownApron);

    // Concrete Quay at Harbor
    const quayGeo = new THREE.BoxGeometry(18, 4, 38);
    const quayMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const quay = new THREE.Mesh(quayGeo, quayMat);
    quay.position.set(24, -2, 0);
    quay.receiveShadow = !this.isSoftwareGl;
    this.scene.add(quay);

    // Quay safety edge
    const edgeStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.16, 38),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 })
    );
    edgeStripe.position.set(32.6, 0.08, 0);
    this.scene.add(edgeStripe);

    // Ocean water
    const waterGeo = new THREE.PlaneGeometry(90, 90, 24, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.9,
    });
    this.waterPlane = new THREE.Mesh(waterGeo, waterMat);
    this.waterPlane.rotation.x = -Math.PI / 2;
    this.waterPlane.position.set(68, -0.6, 0);
    this.scene.add(this.waterPlane);
  }

  private buildClouds() {
    const cloudGeo = new THREE.DodecahedronGeometry(1.5, 1);
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });

    const positions = [
      [-36, 19, -14], [-16, 22, -18], [8, 20, -16],
      [32, 21, -12], [-28, 18, 16], [2, 21, 18], [36, 19, 15]
    ];

    positions.forEach(([cx, cy, cz]) => {
      const grp = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        puff.position.set(
          (i - 1.5) * 1.6 + (Math.random() - 0.5) * 0.4,
          Math.sin(i * 1.3) * 0.4,
          (Math.random() - 0.5) * 0.6
        );
        const s = 0.9 + Math.random() * 0.5;
        puff.scale.set(s, s * 0.75, s);
        grp.add(puff);
      }
      grp.position.set(cx, cy, cz);
      this.clouds.push(grp);
      this.scene.add(grp);
    });
  }

  /**
   * STEP 1: GODOWN WAREHOUSE (Factory) & TRUCK
   */
  private buildGodownZone() {
    const godownGroup = new THREE.Group();
    // Factory moved well away from the road and truck so the truck starts fully in the clear!
    godownGroup.position.set(-36, 0, -4.5);

    // Main Godown Warehouse Building
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.7 }); // Industrial red brick
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.6 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

    // Warehouse main hall (X: [-6.5, 6.5], Y: [0, 6.8], Z: [-5.5, 5.5])
    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(13, 6.8, 11), wallMat);
    warehouse.position.set(0, 3.4, 0);
    warehouse.castShadow = !this.isSoftwareGl;
    warehouse.receiveShadow = !this.isSoftwareGl;
    godownGroup.add(warehouse);

    // Base trim foundation
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.6, 11.4), trimMat);
    foundation.position.set(0, 0.3, 0);
    godownGroup.add(foundation);

    // Slanted Warehouse Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.2, 2.6, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.4, 1.0, 1.4);
    roof.position.set(0, 8.0, 0);
    roof.castShadow = !this.isSoftwareGl;
    godownGroup.add(roof);

    // Raised Concrete Loading Dock in front of the shutter
    const dockGeo = new THREE.BoxGeometry(10, 0.8, 3.0);
    const dockMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 });
    const dock = new THREE.Mesh(dockGeo, dockMat);
    dock.position.set(0, 0.4, 6.8); // Extends from z = 5.3 to z = 8.3 in godownGroup (world z = 0.8 to 3.8)
    dock.receiveShadow = !this.isSoftwareGl;
    godownGroup.add(dock);

    // Hazard warning stripe on dock front edge
    const hazardStripe = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.15, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    hazardStripe.position.set(0, 0.75, 8.35);
    godownGroup.add(hazardStripe);

    // Roll-up Shutter Loading Door facing the loading dock
    const shutter = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 4.2, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.5 })
    );
    shutter.position.set(0, 2.4, 5.58);
    godownGroup.add(shutter);

    // Signboard: "CENTRAL GODOWN"
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 1.1, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 })
    );
    sign.position.set(0, 5.2, 5.62);
    godownGroup.add(sign);

    // Godown Crates Group (Pallets staged on the loading dock!)
    this.godownCratesGroup = new THREE.Group();
    this.godownCratesGroup.position.set(0, 0.82, 6.8);
    godownGroup.add(this.godownCratesGroup);

    this.scene.add(godownGroup);

    // REALISTIC DELIVERY TRUCK (Starts parked straight at godown on z = ROAD_Z)
    this.truckGroup = new THREE.Group();
    this.truckGroup.position.set(this.GODOWN_TRUCK_X, 0, this.ROAD_Z);
    this.truckGroup.rotation.y = Math.PI / 2; // Facing +X (straight towards railway station!)

    const truckCabMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }); // Vibrant cyan cab
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

    // Truck Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 1.8), truckCabMat);
    cab.position.set(0, 1.3, 1.6);
    cab.castShadow = !this.isSoftwareGl;

    // Windshield
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.1 })
    );
    windshield.position.set(0, 1.5, 2.52);

    // Headlights
    [-0.7, 0.7].forEach((hx) => {
      const hl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8 })
      );
      hl.rotation.x = Math.PI / 2;
      hl.position.set(hx, 0.75, 2.52);
      this.truckGroup!.add(hl);
    });

    // Front Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.3), bumperMat);
    bumper.position.set(0, 0.5, 2.55);

    // Cargo Flatbed & Walls (Ribbed truck cargo bed)
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.4, 3.8),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 }) // Teak/amber bed
    );
    bed.position.set(0, 0.7, -1.0);
    bed.castShadow = !this.isSoftwareGl;

    // Side Rails
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 3.8), bumperMat);
    railL.position.set(-1.05, 1.1, -1.0);
    const railR = railL.clone();
    railR.position.x = 1.05;

    // Exhaust Pipe
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.0, 8), chromeMat);
    exhaust.position.set(1.05, 1.8, 0.6);

    // 6 Truck Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
    [-2.2, -0.6, 1.6].forEach((wz) => {
      [-1.1, 1.1].forEach((wx) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.38, wz);
        wheel.castShadow = !this.isSoftwareGl;
        this.truckWheels.push(wheel);
        this.truckGroup!.add(wheel);
      });
    });

    // Truck Cargo payload group
    this.truckCargoGroup = new THREE.Group();
    this.truckCargoGroup.position.set(0, 0.95, -1.0);

    this.truckGroup.add(cab, windshield, bumper, bed, railL, railR, exhaust, this.truckCargoGroup);
    this.scene.add(this.truckGroup);

    this.updateGodownBoxes(3, 4, 0xf59e0b);
  }

  public updateGodownBoxes(rows: number, cols: number, colorHex: number) {
    if (!this.godownCratesGroup) return;

    while (this.godownCratesGroup.children.length > 0) {
      const child = this.godownCratesGroup.children[0];
      this.godownCratesGroup.remove(child);
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    }

    const boxSize = 0.44;
    const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const boxMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set((c - (cols - 1) / 2) * 0.55, boxSize / 2, (r - (rows - 1) / 2) * 0.55);
        box.castShadow = !this.isSoftwareGl;
        this.godownCratesGroup.add(box);
      }
    }

    // Mirror onto truck bed
    if (this.truckCargoGroup) {
      while (this.truckCargoGroup.children.length > 0) {
        this.truckCargoGroup.remove(this.truckCargoGroup.children[0]);
      }
      const cloned = this.godownCratesGroup.clone(true);
      cloned.position.set(0, 0, 0);
      this.truckCargoGroup.add(cloned);
    }
  }

  /**
   * STEP 2: RAILWAY STATION & FREIGHT TRAIN
   */
  private buildRailwayStationZone() {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(this.STATION_TRUCK_X, 0, 3.5);

    // Platform between road (z = 6) and train tracks (z = 1)
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.4, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 })
    );
    platform.position.set(0, 0.2, 0);
    platform.receiveShadow = !this.isSoftwareGl;
    stationGroup.add(platform);

    // Station Canopy Roof
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.3, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
    );
    canopy.position.set(0, 3.4, 0);
    canopy.castShadow = !this.isSoftwareGl;
    stationGroup.add(canopy);

    // Canopy Pillars
    [-6, -2, 2, 6].forEach((px) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
      );
      pillar.position.set(px, 1.7, 0);
      stationGroup.add(pillar);
    });

    // Station Sign: "CENTRAL FREIGHT STATION"
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 0.8, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    sign.position.set(0, 2.6, 1.75);
    stationGroup.add(sign);

    this.scene.add(stationGroup);

    // Train Tracks (parallel at z = RAIL_Z)
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });

    for (let rx = -20; rx <= 24; rx += 1.1) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 3.0), sleeperMat);
      sleeper.position.set(rx, 0.06, this.RAIL_Z);
      this.scene.add(sleeper);
    }

    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(45, 0.16, 0.12), railMat);
    rail1.position.set(2, 0.2, this.RAIL_Z - 0.9);
    const rail2 = rail1.clone();
    rail2.position.z = this.RAIL_Z + 0.9;
    this.scene.add(rail1, rail2);

    // CARTOON DIESEL TRAIN (Locomotive + Wagons)
    this.trainGroup = new THREE.Group();
    this.trainGroup.position.set(this.STATION_TRAIN_X, 0.2, this.RAIL_Z);

    const locoMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 }); // Emerald diesel
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

    const locoBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 1.8), locoMat);
    locoBody.position.set(1.8, 1.2, 0);
    locoBody.castShadow = !this.isSoftwareGl;

    const locoCab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 1.9), cabMat);
    locoCab.position.set(-0.6, 1.5, 0);
    locoCab.castShadow = !this.isSoftwareGl;

    // Smokestack
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.35, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    stack.position.set(2.4, 2.4, 0);

    // Headlight
    const headlight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8 })
    );
    headlight.rotation.z = Math.PI / 2;
    headlight.position.set(3.7, 1.2, 0);

    // Locomotive Wheels (6 wheels)
    const tWheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    [-1.2, 0.4, 2.2].forEach((wx) => {
      [-1.0, 1.0].forEach((wz) => {
        const wheel = new THREE.Mesh(tWheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.42, wz);
        this.trainWheels.push(wheel);
        this.trainGroup!.add(wheel);
      });
    });

    this.trainGroup.add(locoBody, locoCab, stack, headlight);

    // Flatbed Wagon attached behind locomotive
    const wagon = new THREE.Group();
    wagon.position.set(-4.5, 0, 0);

    const wagonBed = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.4, 1.9),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 })
    );
    wagonBed.position.set(0, 0.65, 0);
    wagonBed.castShadow = !this.isSoftwareGl;
    wagon.add(wagonBed);

    [-1.2, 1.2].forEach((wx) => {
      [-1.0, 1.0].forEach((wz) => {
        const wheel = new THREE.Mesh(tWheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.42, wz);
        this.trainWheels.push(wheel);
        wagon.add(wheel);
      });
    });

    this.trainCargoGroup = new THREE.Group();
    this.trainCargoGroup.position.set(0, 0.9, 0);
    wagon.add(this.trainCargoGroup);

    this.trainGroup.add(wagon);
    this.scene.add(this.trainGroup);
  }

  public updateStationTrainCargo(crates: number, groups: number, colorHex: number) {
    if (!this.trainCargoGroup) return;

    while (this.trainCargoGroup.children.length > 0) {
      const child = this.trainCargoGroup.children[0];
      this.trainCargoGroup.remove(child);
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    }

    const crateSize = 0.42;
    const crateGeo = new THREE.BoxGeometry(crateSize, crateSize, crateSize);
    const crateMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 });

    const perGroup = Math.ceil(crates / groups);
    let count = 0;
    for (let g = 0; g < groups; g++) {
      const gx = (g - (groups - 1) / 2) * 1.0;
      for (let i = 0; i < perGroup && count < crates; i++) {
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(gx, Math.floor(i / 2) * 0.46 + 0.22, (i % 2 === 0 ? -0.3 : 0.3));
        crate.castShadow = !this.isSoftwareGl;
        this.trainCargoGroup.add(crate);
        count++;
      }
    }
  }

  /**
   * STEP 3: FREIGHT YARD - FORKLIFT TO SHIPPING CONTAINER
   */
  private buildFreightYardZone() {
    const yardGroup = new THREE.Group();
    yardGroup.position.set(this.YARD_TRAIN_X, 0, 0);

    // Concrete Staging Pad - distinct height and no Z-fighting
    const yardPad = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
    );
    yardPad.position.set(2, 0.08, 3.5);
    yardPad.receiveShadow = !this.isSoftwareGl;
    yardGroup.add(yardPad);

    // Big Shipping Container positioned in the background so forklift is 100% visible in foreground
    this.yardContainerGroup = new THREE.Group();
    this.yardContainerGroup.position.set(7.5, 0.16, 1.5);

    // Build realistic, flicker-free 20ft Shipping Container with open doorway
    const contMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45, metalness: 0.15 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });

    // 1. Base steel frame
    const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 2.2), steelMat);
    baseFrame.position.set(0, 0.07, 0);
    this.yardContainerGroup.add(baseFrame);

    // 2. Interior wooden plank floor
    const interiorFloor = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.02, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
    );
    interiorFloor.position.set(0, 0.15, 0);
    this.yardContainerGroup.add(interiorFloor);

    // 3. Roof steel panel
    const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 2.2), contMat);
    roofPanel.position.set(0, 2.34, 0);
    roofPanel.castShadow = !this.isSoftwareGl;
    this.yardContainerGroup.add(roofPanel);

    // 4. Back Wall (+X end)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.16, 2.16), contMat);
    backWall.position.set(2.34, 1.2, 0);
    backWall.castShadow = !this.isSoftwareGl;
    this.yardContainerGroup.add(backWall);

    // 5. Side Walls (-Z and +Z)
    const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(4.68, 2.16, 0.1), contMat);
    sideWallL.position.set(0, 1.2, 1.05);
    sideWallL.castShadow = !this.isSoftwareGl;
    const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(4.68, 2.16, 0.1), contMat);
    sideWallR.position.set(0, 1.2, -1.05);
    sideWallR.castShadow = !this.isSoftwareGl;
    this.yardContainerGroup.add(sideWallL, sideWallR);

    // 6. Corrugation Ribs on sides (give depth and zero Z-fighting)
    const ribGeo = new THREE.BoxGeometry(0.1, 2.1, 0.05);
    for (let rx = -2.0; rx <= 2.0; rx += 0.55) {
      const ribL = new THREE.Mesh(ribGeo, contMat);
      ribL.position.set(rx, 1.2, 1.12);
      const ribR = new THREE.Mesh(ribGeo, contMat);
      ribR.position.set(rx, 1.2, -1.12);
      this.yardContainerGroup.add(ribL, ribR);
    }

    // 7. Sturdy 4 Corner Posts
    const postGeo = new THREE.BoxGeometry(0.24, 2.4, 0.24);
    [[-2.28, 0.98], [2.28, 0.98], [-2.28, -0.98], [2.28, -0.98]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, steelMat);
      post.position.set(px, 1.2, pz);
      post.castShadow = !this.isSoftwareGl;
      this.yardContainerGroup!.add(post);
    });

    // 8. Open Door entrance at -X end: REAL HOLLOW ENTRANCE!
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.95), doorMat);
    doorL.position.set(-2.4, 1.2, 0.85);
    doorL.rotation.y = Math.PI / 3;
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.95), doorMat);
    doorR.position.set(-2.4, 1.2, -0.85);
    doorR.rotation.y = -Math.PI / 3;
    this.yardContainerGroup.add(doorL, doorR);

    yardGroup.add(this.yardContainerGroup);

    // DETAILED FORKLIFT (Moves items from train to container)
    this.forkliftGroup = new THREE.Group();
    this.forkliftGroup.position.set(this.FORKLIFT_HOME_X, 0.05, 3.0);

    const fBodyMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35 }); // Safety yellow
    const fChassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 2.2), fBodyMat);
    fChassis.position.y = 0.55;
    fChassis.castShadow = !this.isSoftwareGl;

    // Driver Roll Cage
    const cage = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.4, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, wireframe: true })
    );
    cage.position.set(0, 1.55, -0.2);

    // Vertical Mast & Forks
    const mast = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.2, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    mast.position.set(0, 1.35, 1.15);

    const forkL = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 })
    );
    forkL.position.set(-0.32, 0.2, 1.75);
    const forkR = forkL.clone();
    forkR.position.x = 0.32;

    // 4 Wheels
    const fWheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 14);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    [[-0.85, -0.65], [0.85, -0.65], [-0.85, 0.65], [0.85, 0.65]].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(fWheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.28, wz);
      this.forkliftWheels.push(wheel);
      this.forkliftGroup!.add(wheel);
    });

    this.forkliftCargoGroup = new THREE.Group();
    this.forkliftCargoGroup.position.set(0, 0.25, 1.75);

    this.forkliftGroup.add(fChassis, cage, mast, forkL, forkR, this.forkliftCargoGroup);
    this.scene.add(this.forkliftGroup);
    this.scene.add(yardGroup);
  }

  public updateForkliftCargo(crates: number, colorHex: number) {
    if (!this.forkliftCargoGroup) return;

    while (this.forkliftCargoGroup.children.length > 0) {
      const child = this.forkliftCargoGroup.children[0];
      this.forkliftCargoGroup.remove(child);
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    }

    const boxSize = 0.38;
    const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const boxMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 });

    const count = Math.min(crates, 6);
    for (let i = 0; i < count; i++) {
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set((i % 2 === 0 ? -0.2 : 0.2), Math.floor(i / 2) * 0.4 + 0.2, 0);
      this.forkliftCargoGroup.add(box);
    }
  }

  /**
   * STEP 4: HARBOR CRANE & OVERSEAS CARGO SHIP
   */
  private buildHarborZone() {
    const harborZone = new THREE.Group();
    harborZone.position.set(28, 0, 0);

    // Giant Yellow Gantry Crane
    const craneGroup = new THREE.Group();
    craneGroup.position.set(0, 0, 0);

    const craneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

    // 4 Tall A-Frame Legs
    const legGeo = new THREE.BoxGeometry(0.8, 14, 0.8);
    [[-3, -6], [-3, 6], [3, -6], [3, 6]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, craneMat);
      leg.position.set(lx, 7, lz);
      leg.castShadow = !this.isSoftwareGl;
      craneGroup.add(leg);
    });

    // Boom arm extending out over water & ship
    const boom = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 2.2), craneMat);
    boom.position.set(5, 14.5, 0);
    boom.castShadow = !this.isSoftwareGl;
    craneGroup.add(boom);

    // Crane Cabin
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 1.8), darkMat);
    cab.position.set(0, 13.2, 0);
    craneGroup.add(cab);

    // Trolley & Spreader
    this.craneTrolley = new THREE.Group();
    this.craneTrolley.position.set(0, 13.8, 0);

    const trolleyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 2.0), darkMat);
    this.craneTrolley.add(trolleyMesh);

    this.craneSpreader = new THREE.Group();
    this.craneSpreader.position.set(0, -4, 0);

    const spreaderBar = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.35, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
    );
    this.craneSpreader.add(spreaderBar);

    this.craneHeldContainer = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.4, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 }) // Blue Container
    );
    this.craneHeldContainer.position.y = -0.9;
    this.craneHeldContainer.castShadow = !this.isSoftwareGl;
    this.craneSpreader.add(this.craneHeldContainer);

    this.craneTrolley.add(this.craneSpreader);
    craneGroup.add(this.craneTrolley);
    harborZone.add(craneGroup);

    // OVERSEAS CARGO SHIP
    this.shipGroup = new THREE.Group();
    this.shipGroup.position.set(16, -0.2, 0);

    const hullMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 24), hullMat);
    hull.position.y = 0.6;
    hull.castShadow = !this.isSoftwareGl;

    const bow = new THREE.Mesh(
      new THREE.CylinderGeometry(5.0, 4.2, 3.2, 4, 1, false, 0, Math.PI),
      hullMat
    );
    bow.rotation.y = -Math.PI / 2;
    bow.position.set(0, 0.6, 12);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.4, 24.2), bootMat);
    stripe.position.y = -0.6;

    const deck = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.2, 23.6), deckMat);
    deck.position.y = 2.25;

    // Bridge / Wheelhouse
    const bridge = new THREE.Group();
    bridge.position.set(0, 2.3, -8);

    const bridgeLower = new THREE.Mesh(
      new THREE.BoxGeometry(8, 2.5, 4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    bridgeLower.position.y = 1.25;

    const bridgeUpper = new THREE.Mesh(
      new THREE.BoxGeometry(6, 1.5, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    bridgeUpper.position.y = 3.2;

    const funnel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.9, 2.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
    );
    funnel.position.set(0, 4.8, -0.6);

    bridge.add(bridgeLower, bridgeUpper, funnel);

    // Stacks of containers on ship deck
    this.shipContainersGroup = new THREE.Group();
    this.shipContainersGroup.position.set(0, 2.35, 2);

    this.shipGroup.add(hull, bow, stripe, deck, bridge, this.shipContainersGroup);
    harborZone.add(this.shipGroup);

    this.scene.add(harborZone);
    this.updateShipContainers(4, 6);
  }

  public updateShipContainers(rows: number, cols: number) {
    if (!this.shipContainersGroup) return;

    while (this.shipContainersGroup.children.length > 0) {
      const child = this.shipContainersGroup.children[0];
      this.shipContainersGroup.remove(child);
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    }

    const cW = 2.4;
    const cH = 1.1;
    const cL = 1.6;
    const geo = new THREE.BoxGeometry(cW, cH, cL);
    const colors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xa855f7];

    const maxR = Math.min(rows, 6);
    const maxC = Math.min(cols, 4);

    for (let r = 0; r < maxR; r++) {
      const z = (r - (maxR - 1) / 2) * (cL + 0.3);
      for (let c = 0; c < maxC; c++) {
        const x = (c % 2 === 0 ? -1.4 : 1.4);
        const y = Math.floor(c / 2) * (cH + 0.1) + cH / 2;
        const cont = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({ color: colors[(r * 3 + c) % colors.length], roughness: 0.4 })
        );
        cont.position.set(x, y, z);
        this.shipContainersGroup.add(cont);
      }
    }
  }

  private buildLighthouse() {
    const lGroup = new THREE.Group();
    lGroup.position.set(45, 0, -14);

    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(4, 1),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
    );
    rock.scale.set(1.4, 0.6, 1.4);
    rock.position.y = 1;
    lGroup.add(rock);

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.4, 10, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    tower.position.y = 7;
    lGroup.add(tower);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 2.2, 16), redMat);
    s1.position.y = 5;
    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.8, 2.0, 16), redMat);
    s2.position.y = 8.5;
    lGroup.add(s1, s2);

    const beamGeo = new THREE.ConeGeometry(8, 22, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    this.lighthouseBeam = new THREE.Mesh(beamGeo, beamMat);
    this.lighthouseBeam.position.set(0, 12.5, 11);
    this.lighthouseBeam.rotation.x = Math.PI / 2;
    lGroup.add(this.lighthouseBeam);

    this.scene.add(lGroup);
  }

  private buildDecorations() {
    // Trees along perimeter
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });

    const trees = [
      [-42, -12], [-38, -14], [-44, 12], [-38, 14],
      [-14, -14], [-10, -15], [-6, -14],
      [-16, 14], [-10, 15]
    ];

    trees.forEach(([tx, tz]) => {
      const tr = new THREE.Group();
      tr.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 8), trunkMat);
      trunk.position.y = 0.8;
      tr.add(trunk);

      for (let f = 0; f < 3; f++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6 - f * 0.35, 1.5, 7), leafMat);
        cone.position.y = 1.8 + f * 0.9;
        tr.add(cone);
      }
      this.scene.add(tr);
    });
  }

  // Camera presets for each stage
  public glideToStage(stage: TaskStage) {
    if (stage === 'godown') {
      this.targetCamPos.set(-25, 9, 18);
      this.targetLookAt.set(-22, 2, 6);
    } else if (stage === 'station') {
      this.targetCamPos.set(-4, 9, 16);
      this.targetLookAt.set(-4, 2, 3);
    } else if (stage === 'forklift') {
      this.targetCamPos.set(15, 9, 16);
      this.targetLookAt.set(17, 2, 3.5);
    } else if (stage === 'harbor') {
      this.targetCamPos.set(28, 11, 23);
      this.targetLookAt.set(28, 3.5, 0);
    }
  }

  public glideToOverview() {
    this.targetCamPos.set(10, 26, 48);
    this.targetLookAt.set(10, 2, 0);
  }

  // Reset transforms back to stage baseline
  public resetToStage(stage: TaskStage) {
    this.activeProcessStage = null;
    this.processElapsed = 0;
    this.isShipDeparting = false;

    if (this.truckGroup) {
      this.truckGroup.position.set(this.GODOWN_TRUCK_X, 0, this.ROAD_Z);
      this.truckGroup.rotation.y = Math.PI / 2; // Facing +X
    }
    if (this.trainGroup) {
      this.trainGroup.position.set(this.STATION_TRAIN_X, 0.2, this.RAIL_Z);
    }
    if (this.forkliftGroup) {
      this.forkliftGroup.position.set(this.FORKLIFT_HOME_X, 0.05, 3.0);
      this.forkliftGroup.rotation.y = Math.PI / 2;
    }
    if (this.craneTrolley) {
      this.craneTrolley.position.set(0, 13.8, 0);
    }
    if (this.craneSpreader) {
      this.craneSpreader.position.set(0, -4, 0);
    }
    if (this.shipGroup) {
      this.shipGroup.position.set(16, -0.2, 0);
      this.shipGroup.rotation.set(0, 0, 0);
    }

    this.glideToStage(stage);
  }

  public sailShipAway() {
    this.isShipDeparting = true;
    this.targetCamPos.set(16, 20, 36);
    this.targetLookAt.set(24, 2, 18);
  }

  /**
   * Start 4-stage logistics process
   */
  public startGoodsLoadingProcess(
    stage: TaskStage,
    onProgress: (msg: string, percent: number) => void,
    onArrival: () => void
  ) {
    this.activeProcessStage = stage;
    this.processElapsed = 0;
    this.onProcessProgressCb = onProgress;
    this.onProcessArrivalCb = onArrival;
  }

  public skipLoadingProcess() {
    if (!this.activeProcessStage) return;
    this.processElapsed = this.processDuration;
    this.finishLoadingProcess();
  }

  private finishLoadingProcess() {
    const cb = this.onProcessArrivalCb;
    this.activeProcessStage = null;
    if (cb) cb();
  }

  private startLoop() {
    const tick = () => {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const time = this.clock.getElapsedTime();

      // LOGISTICS PROCESS ANIMATIONS
      if (this.activeProcessStage) {
        this.processElapsed += delta;
        const p = Math.min(1.0, this.processElapsed / this.processDuration);
        const percent = p * 100;

        if (this.activeProcessStage === 'godown') {
          // STEP 1: GODOWN TO TRUCK - TRUCK MOVES STRAIGHT ALONG ROAD
          // Ease-in, cruise, ease-out straight along X axis
          if (p < 0.25) {
            this.onProcessProgressCb?.('Loading pallets from the godown onto the truck bed...', percent);
            if (this.truckCargoGroup) {
              this.truckCargoGroup.position.y = 0.95 + Math.sin(p * 35) * 0.12;
            }
          } else {
            const driveP = (p - 0.25) / 0.75;
            // Smooth realistic cubic ease
            const easeP = driveP < 0.5 ? 2 * driveP * driveP : 1 - Math.pow(-2 * driveP + 2, 2) / 2;
            const currentX = this.GODOWN_TRUCK_X + easeP * (this.STATION_TRUCK_X - this.GODOWN_TRUCK_X);

            this.onProcessProgressCb?.('Truck driving straight along the roadway to the Railway Station...', percent);

            if (this.truckGroup) {
              // 100% STRAIGHT movement on Z = ROAD_Z
              this.truckGroup.position.x = currentX;
              this.truckGroup.position.z = this.ROAD_Z;
              this.truckGroup.rotation.y = Math.PI / 2; // Perfectly straight forward
            }

            // Spin truck wheels realistically
            const wheelSpeed = delta * 15;
            this.truckWheels.forEach((w) => {
              w.rotation.x += wheelSpeed;
            });

            // Camera glides straight alongside the truck
            this.targetCamPos.set(currentX, 9, 18);
            this.targetLookAt.set(currentX, 2, this.ROAD_Z);
          }
        } else if (this.activeProcessStage === 'station') {
          // STEP 2: RAILWAY STATION - TRUCK TO TRAIN, TRAIN ROLLS TO FREIGHT YARD
          if (p < 0.3) {
            this.onProcessProgressCb?.('Transferring crates from the truck into the train wagons...', percent);
            if (this.trainCargoGroup) {
              this.trainCargoGroup.position.y = 0.9 + Math.sin(p * 30) * 0.1;
            }
          } else {
            const trainP = (p - 0.3) / 0.7;
            const easeP = trainP < 0.5 ? 2 * trainP * trainP : 1 - Math.pow(-2 * trainP + 2, 2) / 2;
            const currentX = this.STATION_TRAIN_X + easeP * (this.YARD_TRAIN_X - this.STATION_TRAIN_X);

            this.onProcessProgressCb?.('Train #42 steaming down the straight rails to the port freight yard! Choo-choo!', percent);

            if (this.trainGroup) {
              // 100% straight along rails on Z = RAIL_Z
              this.trainGroup.position.x = currentX;
              this.trainGroup.position.z = this.RAIL_Z;
            }

            // Spin train wheels in the correct forward rolling direction (+X travel)
            this.trainWheels.forEach((w) => {
              w.rotation.z += delta * 15;
            });

            // Camera tracks the train steaming down tracks
            this.targetCamPos.set(currentX, 9, 16);
            this.targetLookAt.set(currentX, 2, this.RAIL_Z);
          }
        } else if (this.activeProcessStage === 'forklift') {
          // STEP 3: FREIGHT YARD - FORKLIFT TAKES TIME, LOADS GOODS INTO CONTAINER
          const subP = p;
          if (subP < 0.25) {
            // Forklift rolls up near the train wagon to pick up pallets
            const tP = subP / 0.25;
            this.onProcessProgressCb?.('Forklift rolling up to the train wagon to pick up the pallets...', percent);
            if (this.forkliftGroup) {
              this.forkliftGroup.position.x = this.FORKLIFT_HOME_X - 1.2 + tP * 1.2;
              this.forkliftGroup.position.z = 3.2 - tP * 1.0;
              this.forkliftGroup.rotation.y = Math.PI * 0.75;
            }
            this.forkliftWheels.forEach((w) => {
              w.rotation.x += delta * 12;
            });
          } else if (subP < 0.45) {
            // Forklift lifts goods onto forks and turns to face shipping container
            const tP = (subP - 0.25) / 0.2;
            this.onProcessProgressCb?.('Forklift lifting goods onto its hydraulic forks...', percent);
            if (this.forkliftCargoGroup) {
              this.forkliftCargoGroup.visible = true;
              this.forkliftCargoGroup.position.y = 0.25 + tP * 0.45;
            }
            if (this.forkliftGroup) {
              this.forkliftGroup.rotation.y = THREE.MathUtils.lerp(Math.PI * 0.75, Math.PI / 2, tP);
            }
          } else if (subP < 0.85) {
            // Forklift drives across the foreground directly into container door opening (100% in front!)
            const tP = (subP - 0.45) / 0.4;
            this.onProcessProgressCb?.('Forklift carefully transporting goods into the shipping container...', percent);
            if (this.forkliftGroup) {
              this.forkliftGroup.position.x = 14.0 + tP * 4.2;
              this.forkliftGroup.position.z = 2.2 - tP * 0.7; // aligns with container entrance at z = 1.5
              this.forkliftGroup.rotation.y = Math.PI / 2; // facing +X directly into container doorway!
            }
            this.forkliftWheels.forEach((w) => {
              w.rotation.x += delta * 14;
            });
            this.targetCamPos.set(16 + tP * 2, 8.5, 14);
            this.targetLookAt.set(17 + tP * 2, 2, 2.0);
          } else {
            // Pallet placed inside container, forklift backs up smoothly in clear view
            const tP = (subP - 0.85) / 0.15;
            this.onProcessProgressCb?.('Goods packed securely inside the shipping container! Ready for the crane!', percent);
            if (this.forkliftCargoGroup) {
              this.forkliftCargoGroup.visible = false;
            }
            if (this.forkliftGroup) {
              this.forkliftGroup.position.x = 18.2 - tP * 1.8;
              this.forkliftGroup.rotation.y = Math.PI / 2;
            }
            this.forkliftWheels.forEach((w) => {
              w.rotation.x -= delta * 10;
            });
          }
        } else if (this.activeProcessStage === 'harbor') {
          // STEP 4: HARBOR CRANE - CONTAINER TO SHIP
          if (p < 0.3) {
            const subP = p / 0.3;
            this.onProcessProgressCb?.('Gantry crane aligns over the quay and lowers its spreader...', percent);
            if (this.craneTrolley) this.craneTrolley.position.x = 0;
            if (this.craneSpreader) this.craneSpreader.position.y = -4 - subP * 3.5;
          } else if (p < 0.6) {
            const subP = (p - 0.3) / 0.3;
            this.onProcessProgressCb?.('Hoisting the container high into the air...', percent);
            if (this.craneSpreader) this.craneSpreader.position.y = -7.5 + subP * 5.5; // Up to -2
            if (this.craneTrolley) this.craneTrolley.position.x = subP * 8; // Glide over ship
          } else if (p < 0.88) {
            const subP = (p - 0.6) / 0.28;
            this.onProcessProgressCb?.('Lowering container deep into the cargo vessel hold...', percent);
            if (this.craneTrolley) this.craneTrolley.position.x = 8;
            if (this.craneSpreader) this.craneSpreader.position.y = -2 - subP * 3.5;
          } else {
            this.onProcessProgressCb?.('Vessel fully battened down and ready to sail overseas!', percent);
            if (this.craneSpreader) this.craneSpreader.position.y = -3.5;
          }
        }

        if (p >= 1.0) {
          this.finishLoadingProcess();
        }
      }

      // Camera glide smoothing
      this.currentCamPos.x = THREE.MathUtils.damp(this.currentCamPos.x, this.targetCamPos.x, 3.5, delta);
      this.currentCamPos.y = THREE.MathUtils.damp(this.currentCamPos.y, this.targetCamPos.y, 3.5, delta);
      this.currentCamPos.z = THREE.MathUtils.damp(this.currentCamPos.z, this.targetCamPos.z, 3.5, delta);
      this.camera.position.copy(this.currentCamPos);

      this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, this.targetLookAt.x, 3.5, delta);
      this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, this.targetLookAt.y, 3.5, delta);
      this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, this.targetLookAt.z, 3.5, delta);
      this.camera.lookAt(this.currentLookAt);

      // Clouds
      this.clouds.forEach((c, idx) => {
        c.position.x += delta * (0.8 + (idx % 3) * 0.3);
        if (c.position.x > 60) c.position.x = -50;
      });

      // Ocean & Ship
      this.shipBobTime += delta;
      if (this.shipGroup) {
        if (this.isShipDeparting) {
          this.shipGroup.position.z += delta * 4.5;
          this.shipGroup.position.x += delta * 0.9;
          this.shipGroup.position.y = -0.2 + Math.sin(time * 2.2) * 0.18;
          this.shipGroup.rotation.z = Math.sin(time * 1.5) * 0.025;
          this.shipGroup.rotation.x = Math.cos(time * 1.2) * 0.015;

          this.targetCamPos.set(16 + (this.shipGroup.position.x - 16) * 0.4, 20, 36 + this.shipGroup.position.z * 0.35);
          this.targetLookAt.set(this.shipGroup.position.x, 2, this.shipGroup.position.z);
        } else if (!this.activeProcessStage) {
          this.shipGroup.position.y = -0.2 + Math.sin(this.shipBobTime * 1.2) * 0.15;
          this.shipGroup.rotation.z = Math.sin(this.shipBobTime * 0.8) * 0.015;
          this.shipGroup.rotation.x = Math.cos(this.shipBobTime * 0.6) * 0.01;
        }
      }

      // Lighthouse
      if (this.lighthouseBeam) {
        this.lighthouseBeam.rotation.z = time * 0.8;
      }

      // Water plane
      if (this.waterPlane) {
        this.waterPlane.position.y = -0.6 + Math.sin(time * 1.2) * 0.06;
      }

      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
