import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Group,
  Vector3,
  Line,
  LineBasicMaterial,
  Color,
  AdditiveBlending,
} from 'three';

const STAR_COUNT = 2000;
const STAR_SPHERE_RADIUS = 80;

export class SpaceBackground {
  constructor(scene) {
    this.scene = scene;
    this.group = new Group();
    this.scene.add(this.group);

    // 星星
    this.starPoints = null;
    this.starOpacities = null;   // 每颗星的基础 opacity
    this.starPhases = null;      // 闪烁相位
    this.starFreqs = null;       // 闪烁频率

    // 流星
    this.meteors = [];
    this.meteorTimer = 0;
    this.nextMeteorDelay = this._randomMeteorDelay();

    this._createStars();
  }

  // ==================== Stars ====================

  _createStars() {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);

    this.starPhases = new Float32Array(STAR_COUNT);
    this.starFreqs = new Float32Array(STAR_COUNT);

    const colorOptions = [
      new Color('#ffffff'),  // white
      new Color('#aabbff'),  // pale blue
      new Color('#ccaaff'),  // pale purple
      new Color('#ffeedd'),  // warm white
    ];

    for (let i = 0; i < STAR_COUNT; i++) {
      // 随机球面分布
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const r = STAR_SPHERE_RADIUS * (0.6 + Math.random() * 0.4);

      positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.cos(theta);

      // 颜色
      const c = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // 大小 0.5 ~ 2.0
      sizes[i] = 0.5 + Math.random() * 1.5;

      // 闪烁参数
      this.starPhases[i] = Math.random() * Math.PI * 2;
      this.starFreqs[i] = 0.3 + Math.random() * 1.2;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));

    const material = new PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.starPoints = new Points(geometry, material);
    this.group.add(this.starPoints);
  }

  _updateStars(elapsed) {
    if (!this.starPoints) return;

    // 让整个星空缓慢旋转
    this.starPoints.rotation.y = elapsed * 0.005;

    // 闪烁效果：修改每颗星的 size 属性来模拟亮度变化
    const sizes = this.starPoints.geometry.attributes.size;
    for (let i = 0; i < STAR_COUNT; i++) {
      const baseSize = 0.5 + (sizes.array[i] > 1 ? 1.5 : 0); // 简化
      const flicker = 0.5 + 0.5 * Math.sin(elapsed * this.starFreqs[i] + this.starPhases[i]);
      sizes.array[i] = 0.3 + flicker * 1.7;
    }
    sizes.needsUpdate = true;
  }

  // ==================== Meteors ====================

  _randomMeteorDelay() {
    return 3 + Math.random() * 5; // 3-8 秒
  }

  _spawnMeteor() {
    // 从右上区域出发，向左下划过
    const startX = 15 + Math.random() * 20;
    const startY = 10 + Math.random() * 15;
    const startZ = -(20 + Math.random() * 30);

    // 运动方向：左下偏 30-45 度
    const angle = (30 + Math.random() * 15) * (Math.PI / 180);
    const speed = 25 + Math.random() * 15;
    const dir = new Vector3(
      -Math.cos(angle) * speed,
      -Math.sin(angle) * speed,
      (Math.random() - 0.5) * 5
    );

    // 拖尾用多个顶点
    const tailLength = 20;
    const positions = new Float32Array(tailLength * 3);
    const colors = new Float32Array(tailLength * 4);

    const start = new Vector3(startX, startY, startZ);

    for (let i = 0; i < tailLength; i++) {
      positions[i * 3] = start.x;
      positions[i * 3 + 1] = start.y;
      positions[i * 3 + 2] = start.z;

      // 颜色从亮白 → 淡蓝 → 透明
      const t = i / (tailLength - 1);
      colors[i * 4] = 1.0 - t * 0.3;     // R
      colors[i * 4 + 1] = 1.0 - t * 0.4; // G
      colors[i * 4 + 2] = 1.0;            // B
      colors[i * 4 + 3] = 1.0 - t;        // A (不直接用，但存备用)
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const material = new LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 1.0,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    const line = new Line(geometry, material);
    this.group.add(line);

    this.meteors.push({
      line,
      geometry,
      material,
      head: start.clone(),
      direction: dir,
      tailPositions: [start.clone()],
      tailLength,
      life: 0,
      maxLife: 1.5 + Math.random() * 0.5,
    });
  }

  _updateMeteors(delta) {
    // 生成计时
    this.meteorTimer += delta;
    if (this.meteorTimer >= this.nextMeteorDelay) {
      this.meteorTimer = 0;
      this.nextMeteorDelay = this._randomMeteorDelay();
      this._spawnMeteor();
    }

    // 更新每颗流星
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.life += delta;

      // 移动头部
      m.head.x += m.direction.x * delta;
      m.head.y += m.direction.y * delta;
      m.head.z += m.direction.z * delta;

      // 记录历史位置（拖尾）
      m.tailPositions.unshift(m.head.clone());
      if (m.tailPositions.length > m.tailLength) {
        m.tailPositions.length = m.tailLength;
      }

      // 更新几何体
      const posArr = m.geometry.attributes.position.array;
      for (let j = 0; j < m.tailLength; j++) {
        const p = j < m.tailPositions.length
          ? m.tailPositions[j]
          : m.tailPositions[m.tailPositions.length - 1];
        posArr[j * 3] = p.x;
        posArr[j * 3 + 1] = p.y;
        posArr[j * 3 + 2] = p.z;
      }
      m.geometry.attributes.position.needsUpdate = true;

      // 淡出
      const lifeRatio = m.life / m.maxLife;
      m.material.opacity = Math.max(0, 1 - lifeRatio);

      // 移除死亡流星
      if (m.life >= m.maxLife) {
        this.group.remove(m.line);
        m.geometry.dispose();
        m.material.dispose();
        this.meteors.splice(i, 1);
      }
    }
  }

  // ==================== Public ====================

  update(delta, elapsed) {
    this._updateStars(elapsed);
    this._updateMeteors(delta);
  }
}
