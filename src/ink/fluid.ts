import { INK_HUE_CYCLE_MS, INK_HUE_START_MS, inkColor, type Rgb } from './palette';
import { SHADERS, VERTEX, type ShaderName, type UniformName } from './shaders';
import { canvasSize, gridSize } from './size';

const DEFAULTS = {
  simRes: 128,
  dyeRes: 1024,
  densityDissipation: 0.7,
  velocityDissipation: 0.2,
  pressure: 0.8,
  pressureIterations: 20,
  curl: 30,
  splatRadius: 0.22,
  splatForce: 6000,
  startSplats: 6,
  idleSplatAfterMs: 2000,
  clickRingSplats: 7,
  maxPixels: 2.4e6,
};

export type InkParams = Readonly<typeof DEFAULTS>;
export const INK_PARAMS: InkParams = DEFAULTS;
export type InkState = 'running' | 'paused' | 'lost';

export interface InkOptions {
  params?: Partial<InkParams>;
  background?: Rgb;
  onStateChange?: (state: InkState) => void;
}

export interface InkFluid {
  start(): void;
  stop(): void;
  resize(): void;
  destroy(): void;
  /** Coordinates are 0..1 of the canvas, y down. */
  pointer(x: number, y: number): void;
  splatRing(x: number, y: number): void;
  /** While pressed, bright ink pours at the pointer every frame, moving or not. */
  press(x: number, y: number): void;
  release(): void;
  readonly running: boolean;
}

const MAX_STEP_S = 1 / 60;
const POINTER_GAP_MS = 120;
const START_SPLAT = { speed: 1000, intensity: 8 };
const IDLE_SPLAT = { intensity: 6, repeatAfter: 0.8 };
const RING_SPLAT = { speed: 900, intensity: 5, radius: 0.35 };
// While the button is held: a small, bright pour with a slow random stir so it blooms instead of
// stacking into one flat disc. Intensity is per sixtieth of a second and scales with the real time
// since the last frame, so a 144 Hz screen and a struggling 20 fps one pour the same amount.
const HOLD_SPLAT = { intensity: 1.6, radius: 0.12, stir: 240, maxGapS: 0.1 };
// Strokes drawn with the button held are this much brighter than ordinary ones.
const HOLD_STROKE = 3;

type GL = WebGL2RenderingContext;

interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

interface Swap {
  read: Target;
  write: Target;
}

interface Grids {
  velocity: Swap;
  dye: Swap;
  pressure: Swap;
  divergence: Target;
  curl: Target;
}

interface Program<N extends ShaderName> {
  handle: WebGLProgram;
  uniforms: Record<UniformName<N>, WebGLUniformLocation | null>;
}

type Programs = { [N in ShaderName]: Program<N> };

interface Gpu {
  programs: Programs;
  grids: Grids;
}

function compile(gl: GL, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'compile failed');
  return shader;
}

function link<N extends ShaderName>(gl: GL, vertex: WebGLShader, name: N): Program<N> {
  const handle = gl.createProgram();
  gl.attachShader(handle, vertex);
  gl.attachShader(handle, compile(gl, gl.FRAGMENT_SHADER, SHADERS[name].source));
  gl.linkProgram(handle);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(handle) ?? 'link failed');
  const uniforms = Object.fromEntries(
    SHADERS[name].uniforms.map((uniform) => [uniform, gl.getUniformLocation(handle, uniform)]),
  ) as Program<N>['uniforms'];
  return { handle, uniforms };
}

function createTarget(gl: GL, width: number, height: number, filter: number): Target {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('half-float target refused');
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer, width, height };
}

function sameSize(target: Target, [width, height]: [number, number]): boolean {
  return target.width === width && target.height === height;
}

/**
 * A stable-fluids solver on WebGL2 half-float targets. Returns null when the browser has no WebGL2
 * or cannot render to float textures, so the caller can keep showing its static image.
 * The canvas must already be in the document and sized by CSS.
 */
export function createInkFluid(canvas: HTMLCanvasElement, opts: InkOptions = {}): InkFluid | null {
  const params = { ...INK_PARAMS, ...opts.params };
  const background = opts.background ?? [0, 0, 0];

  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return null;

  let gpu: Gpu | null = null;
  let raf = 0;
  let wanted = false;
  let lastFrame = 0;
  let idleMs = 0;
  const ptr = { x: 0, y: 0, dx: 0, dy: 0, at: -Infinity, moved: false };
  let held = false;

  const hueTime = (now: number) => now + INK_HUE_START_MS;

  const release = () => gl.getExtension('WEBGL_lose_context')?.loseContext();

  const fitCanvas = (): boolean => {
    const [width, height] = canvasSize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1, params.maxPixels);
    if (canvas.width === width && canvas.height === height) return false;
    canvas.width = width;
    canvas.height = height;
    return true;
  };

  const simSize = () => gridSize(params.simRes, canvas.width, canvas.height);
  const dyeSize = () => gridSize(params.dyeRes, canvas.width, canvas.height);

  const createGrids = (): Grids => {
    const [sw, sh] = simSize();
    const [dw, dh] = dyeSize();
    const pair = (w: number, h: number, filter: number): Swap => ({
      read: createTarget(gl, w, h, filter),
      write: createTarget(gl, w, h, filter),
    });
    return {
      velocity: pair(sw, sh, gl.LINEAR),
      dye: pair(dw, dh, gl.LINEAR),
      pressure: pair(sw, sh, gl.NEAREST),
      divergence: createTarget(gl, sw, sh, gl.NEAREST),
      curl: createTarget(gl, sw, sh, gl.NEAREST),
    };
  };

  const deleteGrids = ({ velocity, dye, pressure, divergence, curl }: Grids) => {
    for (const t of [velocity.read, velocity.write, dye.read, dye.write, pressure.read, pressure.write, divergence, curl]) {
      gl.deleteTexture(t.texture);
      gl.deleteFramebuffer(t.framebuffer);
    }
  };

  const build = (): Gpu => {
    // Extensions are per context, so a restored context has to ask again.
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) {
      throw new Error('no float render targets');
    }
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const programs = Object.fromEntries(
      (Object.keys(SHADERS) as ShaderName[]).map((name) => [name, link(gl, vertex, name)]),
    ) as Programs;

    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    return { programs, grids: createGrids() };
  };

  const use = <N extends ShaderName>(g: Gpu, name: N): Program<N>['uniforms'] => {
    const program = g.programs[name];
    gl.useProgram(program.handle);
    return program.uniforms;
  };

  const bind = (unit: number, target: Target): number => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    return unit;
  };

  const draw = (target: Target | null) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const drawInto = (swap: Swap) => {
    draw(swap.write);
    [swap.read, swap.write] = [swap.write, swap.read];
  };

  const splat = (g: Gpu, x: number, y: number, dx: number, dy: number, color: Rgb, radius = params.splatRadius) => {
    const { velocity, dye } = g.grids;
    const aspect = canvas.width / canvas.height;
    const u = use(g, 'splat');
    gl.uniform1f(u.aspectRatio, aspect);
    gl.uniform2f(u.point, x, y);
    gl.uniform1f(u.radius, (radius / 100) * Math.max(1, aspect));
    gl.uniform1i(u.uTarget, bind(0, velocity.read));
    gl.uniform3f(u.color, dx, dy, 0);
    drawInto(velocity);
    gl.uniform1i(u.uTarget, bind(0, dye.read));
    gl.uniform3f(u.color, color[0], color[1], color[2]);
    drawInto(dye);
  };

  const randomSplats = (g: Gpu, count: number, intensity: number, hueTimeMs: () => number) => {
    for (let i = 0; i < count; i++) {
      splat(
        g,
        Math.random(),
        Math.random(),
        START_SPLAT.speed * (Math.random() - 0.5),
        START_SPLAT.speed * (Math.random() - 0.5),
        inkColor(hueTimeMs(), Math.random(), intensity),
      );
    }
  };

  // Strokes follow the hue clock, which starts every visit at deep red. The opening splats each take a
  // random point in the cycle instead, so the first frame already shows the whole range.
  const openingSplats = (g: Gpu) =>
    randomSplats(g, params.startSplats, START_SPLAT.intensity, () => Math.random() * INK_HUE_CYCLE_MS);

  const step = (g: Gpu, dt: number) => {
    const { velocity, dye, pressure, divergence, curl } = g.grids;
    const tx = 1 / velocity.read.width;
    const ty = 1 / velocity.read.height;

    const curlU = use(g, 'curl');
    gl.uniform2f(curlU.texelSize, tx, ty);
    gl.uniform1i(curlU.uVelocity, bind(0, velocity.read));
    draw(curl);

    const vorticityU = use(g, 'vorticity');
    gl.uniform2f(vorticityU.texelSize, tx, ty);
    gl.uniform1i(vorticityU.uVelocity, bind(0, velocity.read));
    gl.uniform1i(vorticityU.uCurl, bind(1, curl));
    gl.uniform1f(vorticityU.curl, params.curl);
    gl.uniform1f(vorticityU.dt, dt);
    drawInto(velocity);

    const divergenceU = use(g, 'divergence');
    gl.uniform2f(divergenceU.texelSize, tx, ty);
    gl.uniform1i(divergenceU.uVelocity, bind(0, velocity.read));
    draw(divergence);

    const scaleU = use(g, 'scale');
    gl.uniform1i(scaleU.uTexture, bind(0, pressure.read));
    gl.uniform1f(scaleU.value, params.pressure);
    drawInto(pressure);

    const pressureU = use(g, 'pressure');
    gl.uniform2f(pressureU.texelSize, tx, ty);
    gl.uniform1i(pressureU.uDivergence, bind(0, divergence));
    for (let i = 0; i < params.pressureIterations; i++) {
      gl.uniform1i(pressureU.uPressure, bind(1, pressure.read));
      drawInto(pressure);
    }

    const gradientU = use(g, 'gradient');
    gl.uniform2f(gradientU.texelSize, tx, ty);
    gl.uniform1i(gradientU.uPressure, bind(0, pressure.read));
    gl.uniform1i(gradientU.uVelocity, bind(1, velocity.read));
    drawInto(velocity);

    const advectionU = use(g, 'advection');
    gl.uniform2f(advectionU.texelSize, tx, ty);
    gl.uniform1f(advectionU.dt, dt);
    gl.uniform1i(advectionU.uVelocity, bind(0, velocity.read));
    gl.uniform1i(advectionU.uSource, 0);
    gl.uniform1f(advectionU.dissipation, params.velocityDissipation);
    drawInto(velocity);

    gl.uniform1i(advectionU.uVelocity, bind(0, velocity.read));
    gl.uniform1i(advectionU.uSource, bind(1, dye.read));
    gl.uniform1f(advectionU.dissipation, params.densityDissipation);
    drawInto(dye);
  };

  const render = (g: Gpu) => {
    const { dye } = g.grids;
    const u = use(g, 'display');
    gl.uniform2f(u.texelSize, 1 / dye.read.width, 1 / dye.read.height);
    gl.uniform3f(u.background, background[0], background[1], background[2]);
    gl.uniform1i(u.uTexture, bind(0, dye.read));
    draw(null);
  };

  const regrid = (g: Gpu) => {
    const old = g.grids;
    if (sameSize(old.velocity.read, simSize()) && sameSize(old.dye.read, dyeSize())) return;
    let next: Grids;
    try {
      next = createGrids();
    } catch {
      return;
    }
    const u = use(g, 'scale');
    gl.uniform1f(u.value, 1);
    for (const field of ['velocity', 'dye'] as const) {
      gl.uniform1i(u.uTexture, bind(0, old[field].read));
      draw(next[field].read);
    }
    g.grids = next;
    deleteGrids(old);
  };

  const notify = () => opts.onStateChange?.(gpu ? (raf ? 'running' : 'paused') : 'lost');

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!gpu) return;
    const elapsed = Math.max(0, (now - lastFrame) / 1000);
    const dt = Math.min(elapsed, MAX_STEP_S);
    lastFrame = now;

    idleMs += dt * 1000;
    if (idleMs > params.idleSplatAfterMs) {
      idleMs = params.idleSplatAfterMs * (1 - IDLE_SPLAT.repeatAfter);
      randomSplats(gpu, 1, IDLE_SPLAT.intensity, () => hueTime(now));
    }

    if (held) {
      const angle = Math.random() * Math.PI * 2;
      splat(
        gpu,
        ptr.x,
        ptr.y,
        Math.cos(angle) * HOLD_SPLAT.stir,
        Math.sin(angle) * HOLD_SPLAT.stir,
        inkColor(hueTime(now), Math.random(), HOLD_SPLAT.intensity * Math.min(elapsed, HOLD_SPLAT.maxGapS) * 60),
        HOLD_SPLAT.radius,
      );
      idleMs = 0;
    }

    if (ptr.moved) {
      const aspect = canvas.width / canvas.height;
      const dx = aspect < 1 ? ptr.dx * aspect : ptr.dx;
      const dy = aspect > 1 ? ptr.dy / aspect : ptr.dy;
      const color = inkColor(hueTime(now), Math.random(), held ? HOLD_STROKE : 1);
      splat(gpu, ptr.x, ptr.y, dx * params.splatForce, dy * params.splatForce, color);
      ptr.dx = 0;
      ptr.dy = 0;
      ptr.moved = false;
    }

    step(gpu, dt);
    render(gpu);
  };

  const run = () => {
    lastFrame = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const halt = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const onLost = (event: Event) => {
    // Without preventDefault the browser never offers the context back.
    event.preventDefault();
    halt();
    gpu = null;
    notify();
  };

  const onRestored = () => {
    try {
      gpu = build();
    } catch {
      return;
    }
    openingSplats(gpu);
    if (wanted) run();
    notify();
  };

  fitCanvas();
  try {
    gpu = build();
  } catch {
    release();
    return null;
  }
  openingSplats(gpu);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    start() {
      wanted = true;
      if (raf || !gpu) return;
      run();
      notify();
    },

    stop() {
      wanted = false;
      if (!raf) return;
      halt();
      notify();
    },

    resize() {
      if (!fitCanvas() || !gpu) return;
      regrid(gpu);
      // Changing a canvas's size clears it, and a paused sim would not repaint.
      render(gpu);
    },

    destroy() {
      halt();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      gpu = null;
      release();
    },

    pointer(x, y) {
      if (!raf) return;
      const now = performance.now();
      const flippedY = 1 - y;
      // A pointer that left and came back would otherwise count the whole jump as one stroke.
      if (now - ptr.at < POINTER_GAP_MS) {
        ptr.dx += x - ptr.x;
        ptr.dy += flippedY - ptr.y;
        ptr.moved = true;
      }
      ptr.x = x;
      ptr.y = flippedY;
      ptr.at = now;
      idleMs = 0;
    },

    press(x, y) {
      ptr.x = x;
      ptr.y = 1 - y;
      held = true;
      idleMs = 0;
    },

    release() {
      held = false;
    },

    splatRing(x, y) {
      if (!gpu) return;
      const now = performance.now();
      for (let i = 0; i < params.clickRingSplats; i++) {
        const angle = (i / params.clickRingSplats) * Math.PI * 2;
        splat(
          gpu,
          x,
          1 - y,
          Math.cos(angle) * RING_SPLAT.speed,
          Math.sin(angle) * RING_SPLAT.speed,
          inkColor(hueTime(now), Math.random(), RING_SPLAT.intensity),
          RING_SPLAT.radius,
        );
      }
      idleMs = 0;
    },

    get running() {
      return raf !== 0;
    },
  };
}
