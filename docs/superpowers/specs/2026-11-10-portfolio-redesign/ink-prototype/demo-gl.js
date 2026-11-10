window.DEMOS = window.DEMOS || {};

window.GLU = (() => {
  const VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
uniform vec2 texelSize;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }

  function program(gl, vs, src) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, src));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, name);
    }
    return { use() { gl.useProgram(p); return u; } };
  }

  function context(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('this browser has no WebGL2');
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) {
      throw new Error('this GPU cannot render to float textures');
    }
    return gl;
  }

  function quad(gl) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return (fbo, w, h) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, w, h);
      gl.bindVertexArray(vao);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  }

  function fbo(gl, w, h, filter) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture, fbo: fb, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
      attach(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture); return unit; },
    };
  }

  function doubleFbo(gl, w, h, filter) {
    let a = fbo(gl, w, h, filter);
    let b = fbo(gl, w, h, filter);
    return {
      width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
      get read() { return a; },
      get write() { return b; },
      swap() { const t = a; a = b; b = t; },
    };
  }

  function canvas(stage, maxPixels) {
    const c = document.createElement('canvas');
    c.className = 'demo-canvas';
    stage.prepend(c);
    const fit = () => {
      const r = stage.getBoundingClientRect();
      let s = Math.min(window.devicePixelRatio || 1, 2);
      if (maxPixels) s = Math.min(s, Math.sqrt(maxPixels / Math.max(1, r.width * r.height)));
      c.width = Math.max(2, Math.round(r.width * s));
      c.height = Math.max(2, Math.round(r.height * s));
    };
    fit();
    return { canvas: c, fit };
  }

  function pointer(stage, h) {
    const pos = (e) => {
      const r = stage.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };
    const mv = (e) => { const p = pos(e); if (h.move) h.move(p[0], p[1]); };
    const dn = (e) => { const p = pos(e); if (h.down) h.down(p[0], p[1]); };
    const lv = () => { if (h.leave) h.leave(); };
    stage.addEventListener('pointermove', mv);
    stage.addEventListener('pointerdown', dn);
    stage.addEventListener('pointerleave', lv);
    return () => {
      stage.removeEventListener('pointermove', mv);
      stage.removeEventListener('pointerdown', dn);
      stage.removeEventListener('pointerleave', lv);
    };
  }

  function lose(gl) {
    const e = gl.getExtension('WEBGL_lose_context');
    if (e) e.loseContext();
  }

  return { VS, compile, program, context, quad, fbo, doubleFbo, canvas, pointer, lose };
})();
