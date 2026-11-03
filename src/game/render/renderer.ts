import * as THREE from 'three'
import type { MomentResult, Scene, TeamColors } from '../types'

/* 场景坐标 → 世界坐标：
   scene.x 0→100 映射到世界 z −50→+50（我方进攻方向是 +z）
   scene.y 0→68 映射到世界 x −34→+34
   高度用世界 y（米） */

export const PITCH_LENGTH = 100
export const PITCH_WIDTH = 68

export function toWorld(x: number, y: number, z = 0): THREE.Vector3 {
  return new THREE.Vector3(y - PITCH_WIDTH / 2, z, x - PITCH_LENGTH / 2)
}

interface Figure {
  group: THREE.Group
  body: THREE.Mesh
  head: THREE.Mesh
  legL: THREE.Mesh
  legR: THREE.Mesh
  armL: THREE.Mesh
  armR: THREE.Mesh
  team: 'us' | 'them' | 'keeper'
}

function makeFigure(shirt: THREE.Color, shorts: THREE.Color): Figure {
  const group = new THREE.Group()
  const skin = new THREE.MeshStandardMaterial({ color: '#d8a887', flatShading: true })
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, flatShading: true })
  const shortsMat = new THREE.MeshStandardMaterial({ color: shorts, flatShading: true })

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.62, 6), shirtMat)
  body.position.y = 1.12
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 0), skin)
  head.position.y = 1.62
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.72, 5), shortsMat)
  legL.position.set(-0.13, 0.42, 0)
  const legR = legL.clone()
  legR.position.x = 0.13
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.52, 5), skin)
  armL.position.set(-0.32, 1.18, 0)
  armL.rotation.z = 0.18
  const armR = armL.clone()
  armR.position.x = 0.32
  armR.rotation.z = -0.18

  group.add(body, head, legL, legR, armL, armR)
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true
      o.receiveShadow = false
    }
  })
  return { group, body, head, legL, legR, armL, armR, team: 'us' }
}

export type CameraMode = 'wide' | 'moment' | 'celebrate'

export class MatchRenderer {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private raf = 0
  private figures: Figure[] = []
  private figurePool: Figure[] = []
  private ball: THREE.Mesh
  private ballShadow: THREE.Mesh
  private container: HTMLElement
  private mode: CameraMode = 'wide'
  private cameraPos = new THREE.Vector3(0, 42, -62)
  private cameraLook = new THREE.Vector3(0, 0, 8)
  private targetPos = new THREE.Vector3(0, 42, -62)
  private targetLook = new THREE.Vector3(0, 0, 8)
  private ballFrom = new THREE.Vector3(0, 0.3, 0)
  private ballTo = new THREE.Vector3(0, 0.3, 0)
  private ballFlight = -1
  private ballDuration = 1
  private ballArc = 1
  private celebrate = 0
  private running = true
  private disposed = false

  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setClearColor('#0a1512')
    container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog('#0a1512', 90, 190)

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.5, 400)
    this.camera.position.copy(this.cameraPos)
    this.camera.lookAt(this.cameraLook)

    this.buildStadium()
    this.ball = this.buildBall()
    this.ballShadow = this.buildBallShadow()

    this.resize()
    this.loop()
  }

  /* ---------------- 场景搭建 ---------------- */

  private buildStadium() {
    const scene = this.scene

    /* 夜战光 */
    scene.add(new THREE.HemisphereLight('#bcd8ff', '#12261c', 1.15))
    const key = new THREE.DirectionalLight('#fff3d6', 2.0)
    key.position.set(-28, 62, -22)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -60
    key.shadow.camera.right = 60
    key.shadow.camera.top = 60
    key.shadow.camera.bottom = -60
    key.shadow.camera.far = 180
    scene.add(key)
    const fill = new THREE.DirectionalLight('#7fb0ff', 0.6)
    fill.position.set(30, 30, 40)
    scene.add(fill)

    /* 草地：条纹 + 低多边形起伏 */
    const stripeCount = 14
    for (let i = 0; i < stripeCount; i += 1) {
      const dark = i % 2 === 0
      const geo = new THREE.PlaneGeometry(PITCH_WIDTH + 14, (PITCH_LENGTH + 10) / stripeCount, 1, 1)
      const mat = new THREE.MeshStandardMaterial({
        color: dark ? '#1d5c3a' : '#227048',
        roughness: 0.95,
        flatShading: true,
      })
      const strip = new THREE.Mesh(geo, mat)
      strip.rotation.x = -Math.PI / 2
      strip.position.z = -(PITCH_LENGTH + 10) / 2 + ((i + 0.5) * (PITCH_LENGTH + 10)) / stripeCount
      strip.receiveShadow = true
      scene.add(strip)
    }

    /* 场地线 */
    const lineMat = new THREE.MeshBasicMaterial({ color: '#e8f5ee' })
    const addLine = (w: number, h: number, x: number, z: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat)
      m.rotation.x = -Math.PI / 2
      m.position.set(x, 0.02, z)
      scene.add(m)
    }
    addLine(PITCH_WIDTH, 0.22, 0, -PITCH_LENGTH / 2)
    addLine(PITCH_WIDTH, 0.22, 0, PITCH_LENGTH / 2)
    addLine(0.22, PITCH_LENGTH, -PITCH_WIDTH / 2, 0)
    addLine(0.22, PITCH_LENGTH, PITCH_WIDTH / 2, 0)
    addLine(PITCH_WIDTH, 0.22, 0, 0)
    addLine(0.22, PITCH_LENGTH, 0, 0)

    /* 中圈 */
    const circle = new THREE.Mesh(new THREE.RingGeometry(9.0, 9.25, 40), lineMat)
    circle.rotation.x = -Math.PI / 2
    circle.position.y = 0.02
    scene.add(circle)

    /* 禁区 */
    const boxGeo = (w: number, d: number) => new THREE.PlaneGeometry(w, d)
    const penalty = new THREE.Mesh(boxGeo(40, 16), new THREE.MeshBasicMaterial({ color: '#e8f5ee', wireframe: true }))
    penalty.rotation.x = -Math.PI / 2
    penalty.position.set(0, 0.02, PITCH_LENGTH / 2 - 8)
    scene.add(penalty)
    const penalty2 = penalty.clone()
    penalty2.position.z = -PITCH_LENGTH / 2 + 8
    scene.add(penalty2)
    const six = new THREE.Mesh(boxGeo(18, 6), new THREE.MeshBasicMaterial({ color: '#e8f5ee', wireframe: true }))
    six.rotation.x = -Math.PI / 2
    six.position.set(0, 0.02, PITCH_LENGTH / 2 - 3)
    scene.add(six)
    const six2 = six.clone()
    six2.position.z = -PITCH_LENGTH / 2 + 3
    scene.add(six2)

    /* 球门 */
    this.buildGoal(PITCH_LENGTH / 2)
    this.buildGoal(-PITCH_LENGTH / 2)

    /* 观众席：低多边形环 */
    const standMat = new THREE.MeshStandardMaterial({ color: '#14201d', flatShading: true })
    for (let i = 0; i < 4; i += 1) {
      const ring = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standMat)
      const w = 108 + i * 14
      const d = 78 + i * 14
      ring.scale.set(w, 6 + i * 5, 5)
      ring.position.set(0, 3 + i * 2.5, -d / 2 - 4)
      scene.add(ring)
      const ring2 = ring.clone()
      ring2.position.z = d / 2 + 4
      scene.add(ring2)
      const ring3 = ring.clone()
      ring3.scale.set(5, 6 + i * 5, d)
      ring3.position.set(-w / 2 - 4, 3 + i * 2.5, 0)
      scene.add(ring3)
      const ring4 = ring3.clone()
      ring4.position.x = w / 2 + 4
      scene.add(ring4)
    }

    /* 灯光塔 */
    for (const [x, z] of [
      [-58, -50],
      [58, -50],
      [-58, 50],
      [58, 50],
    ]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.8, 34, 5),
        new THREE.MeshStandardMaterial({ color: '#2a3833', flatShading: true }),
      )
      pole.position.set(x, 17, z)
      scene.add(pole)
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(7, 3, 1),
        new THREE.MeshBasicMaterial({ color: '#f6fbe8' }),
      )
      lamp.position.set(x, 34, z)
      scene.add(lamp)
      const glow = new THREE.PointLight('#dff3ff', 40, 120)
      glow.position.set(x, 32, z)
      scene.add(glow)
    }
  }

  private buildGoal(z: number) {
    const mat = new THREE.MeshStandardMaterial({ color: '#f2f7f4', flatShading: true })
    const width = 7.32
    const height = 2.44
    const depth = 2
    const post = new THREE.CylinderGeometry(0.09, 0.09, height, 6)
    const left = new THREE.Mesh(post, mat)
    left.position.set(-width / 2, height / 2, z)
    const right = new THREE.Mesh(post, mat)
    right.position.set(width / 2, height / 2, z)
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, width, 6), mat)
    bar.rotation.z = Math.PI / 2
    bar.position.set(0, height, z)
    this.scene.add(left, right, bar)

    /* 网：稀疏的线 */
    const netMat = new THREE.LineBasicMaterial({ color: '#c8ddd3', transparent: true, opacity: 0.32 })
    const pts: THREE.Vector3[] = []
    const dir = z > 0 ? 1 : -1
    for (let i = 0; i <= 8; i += 1) {
      const x = -width / 2 + (i * width) / 8
      pts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, height, z + dir * depth))
    }
    for (let i = 0; i <= 6; i += 1) {
      const y = (i * height) / 6
      pts.push(new THREE.Vector3(-width / 2, y, z), new THREE.Vector3(-width / 2, y, z + dir * depth))
      pts.push(new THREE.Vector3(width / 2, y, z), new THREE.Vector3(width / 2, y, z + dir * depth))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    this.scene.add(new THREE.LineSegments(geo, netMat))
  }

  private buildBall(): THREE.Mesh {
    const geo = new THREE.IcosahedronGeometry(0.34, 1)
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.5 })
    const ball = new THREE.Mesh(geo, mat)
    ball.castShadow = true
    ball.position.set(0, 0.34, 0)
    this.scene.add(ball)
    return ball
  }

  private buildBallShadow(): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 10),
      new THREE.MeshBasicMaterial({ color: '#04120c', transparent: true, opacity: 0.32 }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0.03
    this.scene.add(mesh)
    return mesh
  }

  /* ---------------- 人物 ---------------- */

  private obtainFigure(): Figure {
    const reused = this.figurePool.pop()
    if (reused) {
      reused.group.visible = true
      return reused
    }
    const f = makeFigure(new THREE.Color('#ffffff'), new THREE.Color('#222222'))
    this.scene.add(f.group)
    return f
  }

  private releaseFigures() {
    for (const f of this.figures) {
      f.group.visible = false
      this.figurePool.push(f)
    }
    this.figures = []
  }

  private paintFigure(f: Figure, colors: TeamColors, team: 'us' | 'them' | 'keeper') {
    const shirt = team === 'keeper' ? colors.keeper : colors.shirt
    const shorts = team === 'keeper' ? colors.keeper : colors.shorts
    ;(f.body.material as THREE.MeshStandardMaterial).color.set(shirt)
    ;(f.legL.material as THREE.MeshStandardMaterial).color.set(shorts)
    f.team = team
  }

  /* ---------------- 外部接口 ---------------- */

  /** 展示一次关键瞬间的定格 */
  showScene(scene: Scene, us: TeamColors, them: TeamColors) {
    this.releaseFigures()
    this.mode = 'moment'
    this.celebrate = 0
    this.ballFlight = -1

    const attack = scene.ball.x > 50
    const keeperTeam: 'us' | 'them' = attack ? 'them' : 'us'
    const keeperColors = keeperTeam === 'us' ? us : them

    for (const p of scene.players) {
      const f = this.obtainFigure()
      const isKeeper = p.role === 'GK'
      this.paintFigure(f, p.team === 'us' ? us : them, isKeeper ? 'keeper' : p.team)
      const w = toWorld(p.x, p.y, 0)
      f.group.position.copy(w)
      f.group.rotation.y = p.team === 'us' ? (attack ? 0 : Math.PI) : attack ? Math.PI : 0
      if (isKeeper) {
        f.armL.rotation.z = 1.15
        f.armR.rotation.z = -1.15
      } else {
        f.armL.rotation.z = 0.18
        f.armR.rotation.z = -0.18
      }
      this.figures.push(f)
    }

    /* 场景里不一定带着门将，缺了就单独摆一个 */
    const hasKeeper = scene.players.some((p) => p.team === keeperTeam && p.role === 'GK')
    if (!hasKeeper) {
      const f = this.obtainFigure()
      this.paintFigure(f, keeperColors, 'keeper')
      f.group.position.copy(toWorld(scene.keeper.x, scene.keeper.y, 0))
      f.group.rotation.y = attack ? Math.PI : 0
      f.armL.rotation.z = 1.15
      f.armR.rotation.z = -1.15
      this.figures.push(f)
    }

    const ballW = toWorld(scene.ball.x, scene.ball.y, 0.34)
    this.ball.position.copy(ballW)
    this.ballFrom.copy(ballW)
    this.ballTo.copy(ballW)
    this.ballShadow.position.set(ballW.x, 0.03, ballW.z)

    this.frameMoment(scene)
  }

  private frameMoment(scene: Scene) {
    const attack = scene.ball.x > 50
    const goalZ = attack ? PITCH_LENGTH / 2 : -PITCH_LENGTH / 2
    const ballW = toWorld(scene.ball.x, scene.ball.y, 0)
    this.targetLook.set(ballW.x * 0.35, 1.2, THREE.MathUtils.lerp(ballW.z, goalZ, 0.55))
    const camZ = goalZ > 0 ? goalZ - 24 : goalZ + 24
    this.targetPos.set(THREE.MathUtils.clamp(ballW.x * 0.6, -14, 14), 11.5, camZ)
  }

  /** 播放结果：球飞向落点 */
  playResult(result: MomentResult) {
    this.mode = 'moment'
    this.ballFrom.copy(this.ball.position)
    this.ballTo.copy(toWorld(result.target.x, result.target.y, Math.max(0.3, result.target.z)))
    this.ballFlight = 0
    this.ballDuration = result.outcome === 'goal' ? 0.85 : 0.7
    this.ballArc = result.worldie ? 5.5 : result.kind === 'corner' ? 4.5 : 2.4
    if (result.outcome === 'goal' || result.scoredBy) {
      this.celebrate = 1
    }
  }

  celebrateNow() {
    this.celebrate = 1
  }

  setWide() {
    this.mode = 'wide'
    this.celebrate = 0
    this.ballFlight = -1
    this.releaseFigures()
    this.targetPos.set(0, 42, -62)
    this.targetLook.set(0, 0, 8)
  }

  /** 中场跑位动画：让球员随比赛推进随机游走 */
  idlePlayers(us: TeamColors, them: TeamColors) {
    this.releaseFigures()
    this.mode = 'wide'
    const place = (team: 'us' | 'them', count: number, zBase: number, colors: TeamColors) => {
      for (let i = 0; i < count; i += 1) {
        const f = this.obtainFigure()
        this.paintFigure(f, colors, team)
        const spread = (i / Math.max(1, count - 1) - 0.5) * 46
        f.group.position.set(spread, 0, zBase + (Math.random() - 0.5) * 18)
        f.group.rotation.y = team === 'us' ? 0 : Math.PI
        this.figures.push(f)
      }
    }
    place('us', 6, -12, us)
    place('them', 6, 14, them)
  }

  resize() {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  setPaused(paused: boolean) {
    this.running = !paused
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime

    /* 镜头缓动：推近/拉远 */
    const lerp = 1 - Math.pow(0.001, dt)
    this.camera.position.lerp(this.targetPos, lerp * 0.9)
    this.cameraLook.lerp(this.targetLook, lerp * 0.9)
    this.camera.lookAt(this.cameraLook)

    /* 定格时轻微呼吸感 */
    if (this.mode === 'moment') {
      this.camera.position.y += Math.sin(t * 0.9) * 0.004
    }

    /* 球 */
    if (this.ballFlight >= 0) {
      this.ballFlight += dt / this.ballDuration
      const k = Math.min(1, this.ballFlight)
      const eased = k * k * (3 - 2 * k)
      this.ball.position.lerpVectors(this.ballFrom, this.ballTo, eased)
      this.ball.position.y += Math.sin(Math.PI * eased) * this.ballArc
      this.ball.rotation.x += dt * 14
      this.ball.rotation.z += dt * 9
      if (k >= 1) this.ballFlight = -1
    } else {
      this.ball.rotation.x += dt * 0.6
    }
    this.ballShadow.position.set(this.ball.position.x, 0.03, this.ball.position.z)
    const shadowScale = 1 / (1 + this.ball.position.y * 0.35)
    this.ballShadow.scale.setScalar(shadowScale)
    ;(this.ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.32 * shadowScale

    /* 庆祝时全场闪光 */
    if (this.celebrate > 0) {
      this.celebrate = Math.max(0, this.celebrate - dt * 0.5)
    }

    /* 跑位小动画 */
    for (let i = 0; i < this.figures.length; i += 1) {
      const f = this.figures[i]
      if (this.mode === 'wide') {
        f.group.position.x += Math.sin(t * 0.8 + i) * dt * 0.6
        f.group.position.z += Math.cos(t * 0.7 + i * 1.3) * dt * 0.6
      }
      f.legL.rotation.x = Math.sin(t * 8 + i) * 0.3
      f.legR.rotation.x = -Math.sin(t * 8 + i) * 0.3
    }

    if (this.running || this.mode === 'moment') {
      this.renderer.render(this.scene, this.camera)
    }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.renderer.dispose()
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose()
        const m = o.material
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
        else m.dispose()
      }
    })
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
