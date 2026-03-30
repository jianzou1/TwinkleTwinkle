import {
  Group,
  BoxGeometry,
  MeshLambertMaterial,
  InstancedMesh,
  Mesh,
  Matrix4,
  Color,
  PointLight,
} from 'three';

const BLOCK = 1;

// ---- 颜色 — 黑白灰色谱 ----
const WALL_COLOR = new Color('#b0b0b0');
const WALL_COLOR_2 = new Color('#a0a0a0');
const ROOF_COLOR = new Color('#606060');
const ROOF_COLOR_2 = new Color('#505050');
const CHIMNEY_COLOR = new Color('#484848');
const CHIMNEY_COLOR_2 = new Color('#3e3e3e');
const DOOR_COLOR = new Color('#2a2a2a');
const HANDLE_COLOR = new Color('#ffffff');
const WINDOW_COLOR = new Color('#cccccc');
const FLOOR_COLOR = new Color('#777777');

export class CabinBuilder {
  constructor() {
    this.doorMesh = null;
    this.doorGroup = null;
    this.doorMaterial = null;
    this.doorLight = null;

    this._doorOpening = false;
    this._doorAngle = 0;
    this._doorTargetAngle = Math.PI / 2;
    this._doorSpeed = 3.0;
  }

  build() {
    const group = new Group();

    // 小屋参数（网格坐标）
    // W=5: x 0..4, halfW=2, bx = x-2 → -2,-1,0,1,2
    // H=4: y 0..3
    // D=4: z 0..3, halfD=2, bz = z-2 → -2,-1,0,1
    const W = 5;
    const H = 4;
    const D = 4;
    const halfW = Math.floor(W / 2); // 2
    const halfD = Math.floor(D / 2); // 2

    // 摄像机在 z=+18 看向原点，正面 = z=D-1=3 (bz=+1)
    const FRONT_Z = D - 1;

    // 门: 右侧 x=3 (bx=+1), y=0,1
    const doorGridX = 3;

    const geometry = new BoxGeometry(BLOCK, BLOCK, BLOCK);

    // ======== 跳过集合 ========
    const skipSet = new Set();

    // 门洞: 正面右侧
    skipSet.add(`${doorGridX},0,${FRONT_Z}`);
    skipSet.add(`${doorGridX},1,${FRONT_Z}`);

    // 窗户: 正面左侧 2x2 大窗 (x=0,1; y=1,2)
    skipSet.add(`0,1,${FRONT_Z}`);
    skipSet.add(`0,2,${FRONT_Z}`);
    skipSet.add(`1,1,${FRONT_Z}`);
    skipSet.add(`1,2,${FRONT_Z}`);

    // ======== 墙体 ========
    const wallBlocks = [];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        for (let z = 0; z < D; z++) {
          const isEdgeX = x === 0 || x === W - 1;
          const isEdgeZ = z === 0 || z === D - 1;
          const isFloor = y === 0;

          if (!isEdgeX && !isEdgeZ && !isFloor) continue;
          if (skipSet.has(`${x},${y},${z}`)) continue;

          const bx = x - halfW;
          const bz = z - halfD;
          const color = Math.random() > 0.5 ? WALL_COLOR : WALL_COLOR_2;
          wallBlocks.push({ x: bx, y, z: bz, color });
        }
      }
    }

    // 地板
    for (let x = 1; x < W - 1; x++) {
      for (let z = 1; z < D - 1; z++) {
        wallBlocks.push({
          x: x - halfW, y: 0, z: z - halfD, color: FLOOR_COLOR,
        });
      }
    }

    this._addInstancedBlocks(group, geometry, wallBlocks);

    // ======== 屋顶 (人字形, 3 层) ========
    const roofBlocks = [];
    for (let layer = 0; layer < 3; layer++) {
      const roofY = H + layer;
      const inset = layer;
      for (let x = inset; x < W - inset; x++) {
        for (let z = -1; z < D + 1; z++) {
          const bx = x - halfW;
          const bz = z - halfD;
          const color = Math.random() > 0.5 ? ROOF_COLOR : ROOF_COLOR_2;
          roofBlocks.push({ x: bx, y: roofY, z: bz, color });
        }
      }
    }
    this._addInstancedBlocks(group, geometry, roofBlocks);

    // ======== 烟囱 (左上角, 从屋顶穿出) ========
    this._buildChimney(group, geometry, halfW, halfD, H);

    // ======== 窗户 + 门 ========
    const frontWorldZ = (FRONT_Z - halfD) * BLOCK; // +1

    this._buildWindow(group, geometry, halfW, frontWorldZ);
    this._buildDoor(group, geometry, halfW, frontWorldZ, doorGridX);

    return group;
  }

  _addInstancedBlocks(group, geometry, blocks) {
    const colorGroups = {};
    for (const b of blocks) {
      const key = b.color.getHexString();
      if (!colorGroups[key]) {
        colorGroups[key] = { color: b.color, items: [] };
      }
      colorGroups[key].items.push(b);
    }

    const matrix = new Matrix4();
    for (const key of Object.keys(colorGroups)) {
      const { color, items } = colorGroups[key];
      const mat = new MeshLambertMaterial({ color });
      const mesh = new InstancedMesh(geometry, mat, items.length);
      items.forEach((b, i) => {
        matrix.makeTranslation(b.x * BLOCK, b.y * BLOCK + BLOCK * 0.5, b.z * BLOCK);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }
  }

  _buildChimney(group, geometry, halfW, halfD, wallH) {
    // 烟囱在左上角: bx = -halfW = -2, bz = -halfD = -2 (背面左侧)
    // 从屋顶第一层 (wallH=4) 开始，穿过屋顶向上延伸
    const chimneyBlocks = [];
    const cx = -halfW; // -2
    const cz = -halfD; // -2

    // 烟囱高度: 从 y=wallH 到 y=wallH+4 (比屋顶最高层高出 2 格)
    for (let y = wallH; y <= wallH + 4; y++) {
      const color = Math.random() > 0.5 ? CHIMNEY_COLOR : CHIMNEY_COLOR_2;
      chimneyBlocks.push({ x: cx, y, z: cz, color });
    }

    this._addInstancedBlocks(group, geometry, chimneyBlocks);
  }

  _buildWindow(group, geometry, halfW, frontWorldZ) {
    const windowMat = new MeshLambertMaterial({
      color: WINDOW_COLOR,
      transparent: true,
      opacity: 0.5,
      emissive: WINDOW_COLOR,
      emissiveIntensity: 0.4,
    });

    // 左侧 2x2 大窗: 网格 x=0,1 → bx=-2,-1; y=1,2
    const windowPositions = [
      { bx: -halfW,     gy: 1 },
      { bx: -halfW,     gy: 2 },
      { bx: -halfW + 1, gy: 1 },
      { bx: -halfW + 1, gy: 2 },
    ];

    for (const wp of windowPositions) {
      const win = new Mesh(geometry, windowMat);
      win.position.set(
        wp.bx * BLOCK,
        wp.gy * BLOCK + BLOCK * 0.5,
        frontWorldZ
      );
      group.add(win);
    }

    // 窗户内部光
    const windowLight = new PointLight('#e0e0e0', 0.8, 10);
    windowLight.position.set(
      (-halfW + 0.5) * BLOCK,
      2 * BLOCK + BLOCK * 0.5,
      frontWorldZ - BLOCK
    );
    group.add(windowLight);
  }

  _buildDoor(group, geometry, halfW, frontWorldZ, doorGridX) {
    // 门: 网格 x=doorGridX=3 → bx = 3-halfW = 1
    const doorBx = doorGridX - halfW; // +1
    const doorWorldX = doorBx * BLOCK;
    const doorFrontZ = frontWorldZ + BLOCK * 0.6;

    // ---- 门旋转容器 (pivot 在门左边缘) ----
    this.doorGroup = new Group();
    this.doorGroup.position.set(
      doorWorldX - BLOCK * 0.5,
      0,
      doorFrontZ
    );
    group.add(this.doorGroup);

    // ---- 门面板 ----
    this.doorMaterial = new MeshLambertMaterial({
      color: DOOR_COLOR,
      emissive: new Color('#000000'),
      emissiveIntensity: 0,
    });

    const doorPanel = new Mesh(geometry, this.doorMaterial);
    doorPanel.scale.set(BLOCK, BLOCK * 2, BLOCK * 0.2);
    doorPanel.position.set(BLOCK * 0.5, BLOCK * 1.0, 0);
    this.doorGroup.add(doorPanel);

    // ---- 门把手 ----
    const handleGeo = new BoxGeometry(BLOCK * 0.15, BLOCK * 0.15, BLOCK * 0.2);
    const handleMat = new MeshLambertMaterial({
      color: HANDLE_COLOR,
      emissive: new Color('#ffffff'),
      emissiveIntensity: 0.5,
    });
    const handle = new Mesh(handleGeo, handleMat);
    handle.position.set(BLOCK * 0.25, BLOCK * 0.95, BLOCK * 0.2);
    this.doorGroup.add(handle);

    // ---- 门后光 ----
    this.doorLight = new PointLight('#ffffff', 0, 12);
    this.doorLight.position.set(BLOCK * 0.5, BLOCK * 1.0, -BLOCK * 1.0);
    this.doorGroup.add(this.doorLight);

    this.doorMesh = doorPanel;
  }

  // ==================== 交互 ====================

  setDoorHover(hovering) {
    if (!this.doorMaterial) return;
    if (hovering) {
      this.doorMaterial.emissive.set('#ffffff');
      this.doorMaterial.emissiveIntensity = 0.4;
    } else {
      this.doorMaterial.emissive.set('#000000');
      this.doorMaterial.emissiveIntensity = 0;
    }
  }

  openDoor() {
    this._doorOpening = true;
  }

  updateDoorAnimation(delta) {
    if (!this._doorOpening || !this.doorGroup) return;

    const diff = this._doorTargetAngle - this._doorAngle;
    const step = diff * Math.min(1, this._doorSpeed * delta);
    this._doorAngle += step;
    this.doorGroup.rotation.y = this._doorAngle;

    const progress = Math.abs(this._doorAngle / this._doorTargetAngle);
    if (this.doorLight) {
      this.doorLight.intensity = progress * 4.0;
    }
  }
}
