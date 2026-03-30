import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  Raycaster,
  Vector2,
  Clock,
  Color,
  Fog,
} from 'three';
import { SpaceBackground } from './SpaceBackground.js';
import { IslandBuilder } from './IslandBuilder.js';
import { CabinBuilder } from './CabinBuilder.js';

export class WelcomeApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new Clock();
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();
    this.animationId = null;

    // 子模块
    this.spaceBackground = null;
    this.islandBuilder = null;
    this.cabinBuilder = null;

    // 交互状态
    this.doorMesh = null;
    this.doorGroup = null;
    this.isHoveringDoor = false;
    this.isDoorOpening = false;
    this.isTransitioning = false;

    // 浮动动画
    this.islandGroup = null;
    this.floatTime = 0;

    // bind
    this._onResize = this._onResize.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  init() {
    // ---- Renderer ----
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(new Color('#0a0015'));

    // ---- Scene ----
    this.scene = new Scene();
    this.scene.fog = new Fog('#0a0015', 60, 120);

    // ---- Camera ----
    // 35mm 等效焦距 → FOV ≈ 63°
    this.camera = new PerspectiveCamera(
      63,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2, 18);
    this.camera.lookAt(0, 1, 0);

    // ---- Lighting ----
    this._setupLighting();

    // ---- Scene objects ----
    this._setupScene();

    // ---- Events ----
    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('click', this._onClick);
  }

  _setupLighting() {
    // 柔和环境光 — 中性冷灰
    const ambient = new AmbientLight('#404050', 0.9);
    this.scene.add(ambient);

    // 方向光 — 偏白（模拟远处恒星）
    const dirLight = new DirectionalLight('#e8e8f0', 1.1);
    dirLight.position.set(5, 8, 10);
    this.scene.add(dirLight);

    // 补光 — 微弱冷蓝灰从下方
    const fillLight = new DirectionalLight('#8899aa', 0.3);
    fillLight.position.set(-3, -5, 2);
    this.scene.add(fillLight);
  }

  _setupScene() {
    // 宇宙背景
    this.spaceBackground = new SpaceBackground(this.scene);

    // 浮空岛
    this.islandBuilder = new IslandBuilder();
    this.islandGroup = this.islandBuilder.build();
    this.scene.add(this.islandGroup);

    // 小屋
    this.cabinBuilder = new CabinBuilder();
    const cabinGroup = this.cabinBuilder.build();
    cabinGroup.position.set(0, this.islandBuilder.surfaceY, 0);
    this.islandGroup.add(cabinGroup);

    // 保存门引用 — doorGroup 包含门板+装饰+把手，用于 raycaster 检测
    this.doorMesh = this.cabinBuilder.doorMesh;
    this.doorGroup = this.cabinBuilder.doorGroup;
  }

  start() {
    this._animate();
  }

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // 星空 + 流星动画
    if (this.spaceBackground) {
      this.spaceBackground.update(delta, elapsed);
    }

    // 浮空岛浮动
    if (this.islandGroup) {
      this.floatTime += delta;
      this.islandGroup.position.y = Math.sin(this.floatTime * 0.5 * Math.PI) * 0.05;
    }

    // 门开启动画
    if (this.cabinBuilder) {
      this.cabinBuilder.updateDoorAnimation(delta);
    }

    // hover 检测
    this._checkHover();

    this.renderer.render(this.scene, this.camera);
  }

  _checkHover() {
    if (this.isTransitioning || !this.doorGroup) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.doorGroup.children, true);

    if (intersects.length > 0) {
      if (!this.isHoveringDoor) {
        this.isHoveringDoor = true;
        this.canvas.style.cursor = 'pointer';
        this.cabinBuilder.setDoorHover(true);
      }
    } else {
      if (this.isHoveringDoor) {
        this.isHoveringDoor = false;
        this.canvas.style.cursor = 'default';
        this.cabinBuilder.setDoorHover(false);
      }
    }
  }

  _onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  _onClick() {
    if (this.isTransitioning || this.isDoorOpening) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.doorGroup.children, true);

    if (intersects.length > 0) {
      this._onDoorClick();
    }
  }

  _onDoorClick() {
    this.isDoorOpening = true;
    this.canvas.style.cursor = 'default';

    // 开门动画
    this.cabinBuilder.openDoor();

    // 延迟后启动淡出 + 跳转
    setTimeout(() => {
      this.isTransitioning = true;
      const overlay = document.getElementById('fade-overlay');
      if (overlay) {
        overlay.classList.add('active');
      }

      // 淡出完成后跳转
      setTimeout(() => {
        this.dispose();
        window.location.href = '/page/home.html';
      }, 900);
    }, 800);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    // 解绑事件
    window.removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('click', this._onClick);

    // 停止动画
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // 释放 GPU 资源
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
