import {
  Group,
  BoxGeometry,
  MeshLambertMaterial,
  InstancedMesh,
  Matrix4,
  Color,
} from 'three';

// 方块尺寸
const BLOCK = 1;

// 颜色 — 黑白灰色谱
const COLORS = {
  grass: [new Color('#c8c8c8'), new Color('#b8b8b8'), new Color('#d0d0d0')],
  dirt: [new Color('#888888'), new Color('#7a7a7a'), new Color('#6e6e6e')],
  rock: [new Color('#4a4a4a'), new Color('#555555'), new Color('#3a3a3a'), new Color('#333333')],
};

export class IslandBuilder {
  constructor() {
    this.surfaceY = 0; // 草地表面 Y 坐标
  }

  build() {
    const group = new Group();

    // 收集所有方块
    const blocks = [];
    this._generateIsland(blocks);

    // 按材质分组，使用 InstancedMesh
    const materialGroups = {};

    for (const block of blocks) {
      const key = block.color.getHexString();
      if (!materialGroups[key]) {
        materialGroups[key] = {
          color: block.color,
          positions: [],
        };
      }
      materialGroups[key].positions.push(block);
    }

    const geometry = new BoxGeometry(BLOCK, BLOCK, BLOCK);

    for (const key of Object.keys(materialGroups)) {
      const { color, positions } = materialGroups[key];
      const material = new MeshLambertMaterial({ color });
      const mesh = new InstancedMesh(geometry, material, positions.length);

      const matrix = new Matrix4();
      positions.forEach((b, i) => {
        matrix.makeTranslation(b.x, b.y, b.z);
        mesh.setMatrixAt(i, matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }

    return group;
  }

  _generateIsland(blocks) {
    // 浮空岛尺寸参数
    const topRadiusX = 6;  // 草地层半径 X
    const topRadiusZ = 5;  // 草地层半径 Z
    const depth = 5;       // 岩石层深度（精简）

    // ---- 草地层（顶面） ----
    const grassY = 0;
    this.surfaceY = grassY + BLOCK * 0.5;

    for (let x = -topRadiusX; x <= topRadiusX; x++) {
      for (let z = -topRadiusZ; z <= topRadiusZ; z++) {
        // 椭圆边界 + 随机缺口
        const dist = (x * x) / (topRadiusX * topRadiusX) + (z * z) / (topRadiusZ * topRadiusZ);
        if (dist > 1.0) continue;
        // 边缘随机缺失
        if (dist > 0.8 && Math.random() > 0.6) continue;

        const grassColor = COLORS.grass[Math.floor(Math.random() * COLORS.grass.length)];
        blocks.push({ x: x * BLOCK, y: grassY, z: z * BLOCK, color: grassColor });

        // 草地下方一层土
        const dirtColor = COLORS.dirt[Math.floor(Math.random() * COLORS.dirt.length)];
        blocks.push({ x: x * BLOCK, y: (grassY - 1) * BLOCK, z: z * BLOCK, color: dirtColor });
      }
    }

    // ---- 岩石层（底部逐渐收窄的倒锥形） ----
    for (let dy = 2; dy <= depth; dy++) {
      const y = grassY - dy;
      // 随深度缩小半径
      const shrink = dy / depth;
      const rx = Math.max(1, Math.round(topRadiusX * (1 - shrink * 0.95)));
      const rz = Math.max(1, Math.round(topRadiusZ * (1 - shrink * 0.95)));

      for (let x = -rx; x <= rx; x++) {
        for (let z = -rz; z <= rz; z++) {
          const dist = (x * x) / (rx * rx + 0.01) + (z * z) / (rz * rz + 0.01);
          if (dist > 1.0) continue;
          // 更深层更多随机缺失（更碎裂的感觉）
          if (dist > 0.5 && Math.random() > (0.8 - shrink * 0.3)) continue;

          const rockColor = COLORS.rock[Math.floor(Math.random() * COLORS.rock.length)];
          blocks.push({ x: x * BLOCK, y: y * BLOCK, z: z * BLOCK, color: rockColor });
        }
      }
    }
  }

}

