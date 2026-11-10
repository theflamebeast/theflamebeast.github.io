(function () {
  const H = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 o;
`;

  const FRAG = {
    splat: H + `
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main() {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  vec3 s = exp(-dot(p, p) / radius) * color;
  o = vec4(texture(uTarget, vUv).xyz + s, 1.0);
}`,
    advection: H + `
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  o = texture(uSource, coord) / (1.0 + dissipation * dt);
  o.a = 1.0;
}`,
    divergence: H + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
    curl: H + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
    vorticity: H + `
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 vel = texture(uVelocity, vUv).xy + force * dt;
  o = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
}`,
    pressure: H + `
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float div = texture(uDivergence, vUv).x;
  o = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}`,
    gradient: H + `
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 vel = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  o = vec4(vel, 0.0, 1.0);
}`,
    clear: H + `
uniform sampler2D uTexture;
uniform float value;
void main() { o = value * texture(uTexture, vUv); }`,
    display: H + `
uniform sampler2D uTexture;
uniform vec2 texelSize;
void main() {
  vec3 c = texture(uTexture, vUv).rgb;
  vec3 lc = texture(uTexture, vL).rgb;
  vec3 rc = texture(uTexture, vR).rgb;
  vec3 tc = texture(uTexture, vT).rgb;
  vec3 bc = texture(uTexture, vB).rgb;
  vec3 n = normalize(vec3(length(rc) - length(lc), length(tc) - length(bc), length(texelSize)));
  float diffuse = clamp(dot(n, normalize(vec3(0.3, 0.5, 1.0))) + 0.7, 0.7, 1.0);
  c *= diffuse;
  c = 1.0 - exp(-c * 1.6);
  o = vec4(vec3(0.012, 0.014, 0.024) + c, 1.0);
}`,
  };

  function hsv(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: return [v, t, p];
      case 1: return [q, v, p];
      case 2: return [p, v, t];
      case 3: return [p, q, v];
      case 4: return [t, p, v];
      default: return [v, p, q];
    }
  }

  DEMOS.ink = {
    label: 'Ink fluid',
    copy: 'full',
    align: 'center',
    hint: 'Move your cursor to stir the ink. Click for a burst.',
    start(stage) {
      const { canvas, fit } = GLU.canvas(stage, 2.4e6);
      const gl = GLU.context(canvas);
      const vs = GLU.compile(gl, gl.VERTEX_SHADER, GLU.VS);
      const P = {};
      for (const k in FRAG) P[k] = GLU.program(gl, vs, FRAG[k]);
      const blit = GLU.quad(gl);

      const res = (r) => {
        let a = canvas.width / canvas.height;
        if (a < 1) a = 1 / a;
        const lo = Math.round(r), hi = Math.round(r * a);
        return canvas.width > canvas.height ? [hi, lo] : [lo, hi];
      };
      const [sw, sh] = res(128);
      const [dw, dh] = res(1024);
      const velocity = GLU.doubleFbo(gl, sw, sh, gl.LINEAR);
      const dye = GLU.doubleFbo(gl, dw, dh, gl.LINEAR);
      const pressure = GLU.doubleFbo(gl, sw, sh, gl.NEAREST);
      const divergence = GLU.fbo(gl, sw, sh, gl.NEAREST);
      const curlT = GLU.fbo(gl, sw, sh, gl.NEAREST);
      const C = { densDiss: 0.7, velDiss: 0.2, pressure: 0.8, iters: 20, curl: 30, radius: 0.22, force: 6000 };

      const color = (mult) => {
        const h = 0.52 + 0.4 * (0.5 + 0.5 * Math.sin(performance.now() / 3500 + Math.random() * 0.8));
        const c = hsv(h % 1, 0.85, 1);
        const m = 0.15 * (mult || 1);
        return [c[0] * m, c[1] * m, c[2] * m];
      };

      function splat(x, y, dx, dy, col, radius) {
        const u = P.splat.use();
        const a = canvas.width / canvas.height;
        let r = (radius || C.radius) / 100;
        if (a > 1) r *= a;
        gl.uniform1f(u.aspectRatio, a);
        gl.uniform2f(u.point, x, y);
        gl.uniform1f(u.radius, r);
        gl.uniform1i(u.uTarget, velocity.read.attach(0));
        gl.uniform3f(u.color, dx, dy, 0);
        blit(velocity.write.fbo, sw, sh);
        velocity.swap();
        gl.uniform1i(u.uTarget, dye.read.attach(0));
        gl.uniform3f(u.color, col[0], col[1], col[2]);
        blit(dye.write.fbo, dw, dh);
        dye.swap();
      }

      function randomSplats(count, mult) {
        for (let i = 0; i < count; i++) {
          splat(Math.random(), Math.random(), 1000 * (Math.random() - 0.5), 1000 * (Math.random() - 0.5), color(mult || 8));
        }
      }

      function step(dt) {
        gl.disable(gl.BLEND);
        let u = P.curl.use();
        gl.uniform2f(u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(u.uVelocity, velocity.read.attach(0));
        blit(curlT.fbo, sw, sh);

        u = P.vorticity.use();
        gl.uniform2f(u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(u.uVelocity, velocity.read.attach(0));
        gl.uniform1i(u.uCurl, curlT.attach(1));
        gl.uniform1f(u.curl, C.curl);
        gl.uniform1f(u.dt, dt);
        blit(velocity.write.fbo, sw, sh);
        velocity.swap();

        u = P.divergence.use();
        gl.uniform2f(u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(u.uVelocity, velocity.read.attach(0));
        blit(divergence.fbo, sw, sh);

        u = P.clear.use();
        gl.uniform1i(u.uTexture, pressure.read.attach(0));
        gl.uniform1f(u.value, C.pressure);
        blit(pressure.write.fbo, sw, sh);
        pressure.swap();

        u = P.pressure.use();
        gl.uniform2f(u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(u.uDivergence, divergence.attach(0));
        for (let i = 0; i < C.iters; i++) {
          gl.uniform1i(u.uPressure, pressure.read.attach(1));
          blit(pressure.write.fbo, sw, sh);
          pressure.swap();
        }

        u = P.gradient.use();
        gl.uniform2f(u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(u.uPressure, pressure.read.attach(0));
        gl.uniform1i(u.uVelocity, velocity.read.attach(1));
        blit(velocity.write.fbo, sw, sh);
        velocity.swap();

        u = P.advection.use();
        gl.uniform2f(u.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        const vid = velocity.read.attach(0);
        gl.uniform1i(u.uVelocity, vid);
        gl.uniform1i(u.uSource, vid);
        gl.uniform1f(u.dt, dt);
        gl.uniform1f(u.dissipation, C.velDiss);
        blit(velocity.write.fbo, sw, sh);
        velocity.swap();

        gl.uniform1i(u.uVelocity, velocity.read.attach(0));
        gl.uniform1i(u.uSource, dye.read.attach(1));
        gl.uniform1f(u.dissipation, C.densDiss);
        blit(dye.write.fbo, dw, dh);
        dye.swap();
      }

      function render() {
        const u = P.display.use();
        gl.uniform2f(u.texelSize, 1 / dw, 1 / dh);
        gl.uniform1i(u.uTexture, dye.read.attach(0));
        blit(null, canvas.width, canvas.height);
      }

      const ptr = { x: 0, y: 0, dx: 0, dy: 0, seen: false, moved: false };
      let idle = 0;
      const offPtr = GLU.pointer(stage, {
        move(x, y) {
          const ux = x, uy = 1 - y;
          if (ptr.seen) { ptr.dx += ux - ptr.x; ptr.dy += uy - ptr.y; ptr.moved = true; }
          ptr.x = ux; ptr.y = uy; ptr.seen = true;
          idle = 0;
        },
        down(x, y) {
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            splat(x, 1 - y, Math.cos(a) * 900, Math.sin(a) * 900, color(5), 0.35);
          }
        },
      });

      randomSplats(6);
      let raf = 0, last = performance.now();
      function frame(now) {
        const dt = Math.min((now - last) / 1000, 1 / 60);
        last = now;
        idle += dt;
        if (idle > 2.2) { idle = 0.6; randomSplats(1, 6); }
        if (ptr.moved) {
          const a = canvas.width / canvas.height;
          let dx = ptr.dx, dy = ptr.dy;
          if (a < 1) dx *= a;
          if (a > 1) dy /= a;
          splat(ptr.x, ptr.y, dx * C.force, dy * C.force, color());
          ptr.dx = 0; ptr.dy = 0; ptr.moved = false;
        }
        step(dt);
        render();
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      window.addEventListener('resize', fit);

      return () => {
        cancelAnimationFrame(raf);
        offPtr();
        window.removeEventListener('resize', fit);
        GLU.lose(gl);
        canvas.remove();
      };
    },
  };
})();
