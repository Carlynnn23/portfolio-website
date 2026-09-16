/*
 * Liquid-metal cursor for mingjueliu portfolio.
 *
 * Shader adapted from Paper's "liquid-logo":
 *   https://github.com/paper-design/liquid-logo
 *   Copyright Paper Design — licensed under PolyForm Shield 1.0.0
 *   https://polyformproject.org/licenses/shield/1.0.0
 * Changes: logo texture replaced with procedurally drawn cursor shapes
 * (ring / enlarged ring / VIEW badge) that liquid-morph between hover states.
 * Falls back to the site's DOM cursor when WebGL2 is unavailable.
 */
(function () {
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine) return;

  /* ============ fragment shader (adapted from liquid-logo) ============ */
  const FRAG = `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D u_image_texture;
uniform float u_time;
uniform float u_ratio;
uniform float u_img_ratio;
uniform float u_patternScale;
uniform float u_refraction;
uniform float u_edge;
uniform float u_patternBlur;
uniform float u_liquid;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
    m = m*m;
    m = m*m;
    vec3 x = 2. * fract(p * C.www) - 1.;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130. * dot(m, g);
}

vec2 get_img_uv() {
    vec2 img_uv = vUv;
    img_uv -= .5;
    if (u_ratio > u_img_ratio) {
        img_uv.x = img_uv.x * u_ratio / u_img_ratio;
    } else {
        img_uv.y = img_uv.y * u_img_ratio / u_ratio;
    }
    float scale_factor = 1.;
    img_uv *= scale_factor;
    img_uv += .5;
    img_uv.y = 1. - img_uv.y;
    return img_uv;
}
vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
float get_color_channel(float c1, float c2, float stripe_p, vec3 w, float extra_blur, float b) {
    float ch = c2;
    float border = 0.;
    float blur = u_patternBlur + extra_blur;

    ch = mix(ch, c1, smoothstep(.0, blur, stripe_p));

    border = w[0];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));

    b = smoothstep(.2, .8, b);
    border = w[0] + .4 * (1. - b) * w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));

    border = w[0] + .5 * (1. - b) * w[1];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));

    border = w[0] + w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));

    float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
    float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
    ch = mix(ch, gradient, smoothstep(border - blur, border + blur, stripe_p));

    return ch;
}

float get_img_frame_alpha(vec2 uv, float img_frame_width) {
    float img_frame_alpha = smoothstep(0., img_frame_width, uv.x) * smoothstep(1., 1. - img_frame_width, uv.x);
    img_frame_alpha *= smoothstep(0., img_frame_width, uv.y) * smoothstep(1., 1. - img_frame_width, uv.y);
    return img_frame_alpha;
}

void main() {
    vec2 uv = vUv;
    uv.y = 1. - uv.y;
    uv.x *= u_ratio;

    float diagonal = uv.x - uv.y;

    float t = .001 * u_time;

    vec2 img_uv = get_img_uv();
    vec4 img = texture(u_image_texture, img_uv);

    vec3 color = vec3(0.);
    float opacity = 1.;

    vec3 color1 = vec3(.98, 0.98, 1.);
    vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, uv.x + uv.y));

    float edge = img.r;

    vec2 grad_uv = uv;
    grad_uv -= .5;

    float dist = length(grad_uv + vec2(0., .2 * diagonal));

    grad_uv = rotate(grad_uv, (.25 - .2 * diagonal) * PI);

    float bulge = pow(1.8 * dist, 1.2);
    bulge = 1. - bulge;
    bulge *= pow(uv.y, .3);

    float cycle_width = u_patternScale;
    float thin_strip_1_ratio = .12 / cycle_width * (1. - .4 * bulge);
    float thin_strip_2_ratio = .07 / cycle_width * (1. + .4 * bulge);
    float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

    float thin_strip_1_width = cycle_width * thin_strip_1_ratio;
    float thin_strip_2_width = cycle_width * thin_strip_2_ratio;

    opacity = 1. - smoothstep(.9 - .5 * u_edge, 1. - .5 * u_edge, edge);
    opacity *= get_img_frame_alpha(img_uv, 0.01);

    float noise = snoise(uv - t);

    edge += (1. - edge) * u_liquid * noise;

    float refr = 0.;
    refr += (1. - bulge);
    refr = clamp(refr, 0., 1.);

    float dir = grad_uv.x;

    dir += diagonal;

    dir -= 2. * noise * diagonal * (smoothstep(0., 1., edge) * smoothstep(1., 0., edge));

    bulge *= clamp(pow(uv.y, .1), .3, 1.);
    dir *= (.1 + (1.1 - edge) * bulge);

    dir *= smoothstep(1., .7, edge);

    dir += .18 * (smoothstep(.1, .2, uv.y) * smoothstep(.4, .2, uv.y));
    dir += .03 * (smoothstep(.1, .2, 1. - uv.y) * smoothstep(.4, .2, 1. - uv.y));

    dir *= (.5 + .5 * pow(uv.y, 2.));

    dir *= cycle_width;

    dir -= t;

    float refr_r = refr;
    refr_r += .03 * bulge * noise;
    float refr_b = 1.3 * refr;

    refr_r += 5. * (smoothstep(-.1, .2, uv.y) * smoothstep(.5, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(1., .4, bulge));
    refr_r -= diagonal;

    refr_b += (smoothstep(0., .4, uv.y) * smoothstep(.8, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(.8, .4, bulge));
    refr_b -= .2 * edge;

    refr_r *= u_refraction;
    refr_b *= u_refraction;

    vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
    w[1] -= .02 * smoothstep(.0, 1., edge + bulge);
    float stripe_r = mod(dir + refr_r, 1.);
    float r = get_color_channel(color1.r, color2.r, stripe_r, w, 0.02 + .03 * u_refraction * bulge, bulge);
    float stripe_g = mod(dir, 1.);
    float g = get_color_channel(color1.g, color2.g, stripe_g, w, 0.01 / (1. - diagonal), bulge);
    float stripe_b = mod(dir - refr_b, 1.);
    float b = get_color_channel(color1.b, color2.b, stripe_b, w, .01, bulge);

    color = vec3(r, g, b);

    color *= opacity;

    fragColor = vec4(color, opacity);
}`;

  const VERT = `#version 300 es
precision mediump float;
in vec2 a_position;
out vec2 vUv;
void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  /* ============ canvas + GL setup ============ */
  const SIZE = 120;                       // css px, square
  const TEX = 256;                        // mask texture resolution
  const dpr = Math.min(2, devicePixelRatio || 1);

  const canvas = document.createElement('canvas');
  canvas.className = 'liquid-cursor';
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:' + SIZE + 'px;height:' + SIZE + 'px;' +
    'pointer-events:none;z-index:9999;will-change:transform;transform:translate(-200px,-200px)';

  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return;                        // DOM cursor stays as fallback

  function compile(src, type) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('liquid-cursor shader:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }
  const vs = compile(VERT, gl.VERTEX_SHADER);
  const fs = compile(FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const U = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(prog, i).name;
    U[name] = gl.getUniformLocation(prog, name);
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(U.u_ratio, 1);
  gl.uniform1f(U.u_img_ratio, 1);
  gl.uniform1f(U.u_patternScale, 2);
  gl.uniform1f(U.u_refraction, 0.015);
  gl.uniform1f(U.u_edge, 0.4);
  gl.uniform1f(U.u_patternBlur, 0.005);
  gl.uniform1f(U.u_liquid, 0.07);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.u_image_texture, 0);

  /* ============ mask: the clickable-link arrow (cursor-03), liquid-metal ============
     The dot (default) and ring (hover) are plain DOM elements handled by each page.
     This WebGL canvas renders ONLY the arrow, shown when a clickable element
     (body.cur-view) is hovered — the "liquid-logo" treatment applied to cursor-03. */
  const ARROW_D = "M34.389 74.3607C34.8805 74.1185 35.1914 73.9954 35.9584 73.5635C36.7273 73.1297 38.1086 72.4536 39.0302 72.0601C39.9517 71.6666 41.1673 71.1096 41.7296 70.8231C42.2918 70.5345 42.8875 70.1813 43.0793 70.1026C43.3008 70.0138 43.5428 69.9472 43.6843 69.9069C43.8351 69.8645 44.1013 69.7999 44.2893 69.7192C44.4774 69.6385 45.2015 69.3741 45.9183 69.1844C46.635 68.9927 47.4728 68.8151 47.7799 68.7869C48.0871 68.7606 48.9677 68.6779 49.7347 68.6032C50.5035 68.5306 51.4232 68.4418 51.7825 68.4055C52.1418 68.3691 52.7264 68.4115 53.0857 68.4983C53.445 68.5851 54.1561 68.7082 54.6681 68.7727C55.18 68.8353 55.8912 68.9745 56.2505 69.0795C56.6098 69.1864 57.9502 69.584 59.2291 69.9634C60.51 70.3428 61.7666 70.7686 62.0216 70.9139C62.2785 71.0572 63.4681 71.4567 64.6689 71.8018C66.3183 72.2761 66.8731 72.3689 66.9494 72.1772C67.0034 72.0379 66.7875 71.6747 66.4691 71.3699C66.1508 71.0652 65.2497 70.1692 64.4678 69.3822C63.686 68.5931 62.7123 67.6386 62.3065 67.2633C61.8988 66.8859 61.1243 66.1009 60.5844 65.5177C60.0427 64.9344 59.3669 64.0727 59.0783 63.6005C58.639 62.8801 58.5683 62.5814 58.6297 61.7338C58.6744 61.1183 58.8736 60.4504 59.1416 60.0185C59.3837 59.629 60.3182 58.4868 61.2193 57.4758C62.1222 56.4668 63.6543 54.9613 64.6279 54.1279C65.6016 53.2965 66.8098 52.2148 67.3143 51.7264C67.8188 51.236 68.4053 50.6549 68.6175 50.4329C68.8297 50.2109 69.8406 49.3068 70.8645 48.4229C71.8884 47.539 72.769 46.7681 72.8192 46.7076C72.8695 46.647 73.3312 46.2374 73.8432 45.7954C74.3551 45.3535 74.8633 44.8994 74.9732 44.7864C75.0812 44.6734 75.8351 44.0357 76.6487 43.3698C77.4604 42.7038 78.179 42.0459 78.246 41.9067C78.313 41.7674 78.6071 41.5212 78.8976 41.3598C79.1898 41.1984 79.7204 40.7907 80.0797 40.4537C80.439 40.1187 80.8151 39.7736 80.9175 39.6889C81.0198 39.6041 81.4387 39.2651 81.8483 38.9361C82.2579 38.6072 82.6767 38.2641 82.7791 38.1774C82.8815 38.0886 83.3004 37.7455 83.7099 37.4166C84.1195 37.0856 84.6873 36.6094 84.974 36.3591C85.2588 36.1089 85.7392 35.677 86.0389 35.3985C86.3405 35.1221 86.6942 34.7992 86.8245 34.6842C86.9548 34.5691 88.0383 33.661 89.2316 32.6661C90.4249 31.6712 91.5736 30.8075 91.7188 30.6562C91.9012 30.4665 91.9943 30.2404 91.9999 30.075C92.0055 29.9337 91.743 29.968 90.9518 30.3878C90.4138 30.6703 89.9465 31.0678 89.8478 31.1445C89.7492 31.2212 89.3321 31.4997 88.9226 31.7661C88.513 32.0325 88.1351 32.3009 88.0848 32.3634C88.0346 32.426 87.6157 32.7468 87.154 33.0758C86.6923 33.4067 86.1487 33.7882 85.9439 33.9254C85.7392 34.0606 85.4469 34.2382 85.2924 34.3209C85.1378 34.4016 83.8831 35.2351 82.4999 36.1694C81.1167 37.1038 79.713 38.0159 79.3779 38.1975C79.0428 38.3792 78.771 38.5951 78.7728 38.6778C78.7747 38.7606 78.5885 38.8696 78.3577 38.92C78.1268 38.9705 77.7694 39.1743 77.5609 39.3741C77.3542 39.5738 76.8516 39.9169 76.4439 40.1349C76.038 40.3548 75.4125 40.7241 75.0532 40.9582C74.6939 41.1923 73.8152 41.7311 73.0985 42.1549C72.3818 42.5787 71.6278 43.0267 71.423 43.1478C71.2182 43.2709 71.0079 43.4162 70.9576 43.4707C70.9055 43.5251 70.5704 43.7431 70.2129 43.951C69.8536 44.1588 69.1853 44.5564 68.7236 44.8349C68.2619 45.1113 67.0481 45.8479 66.0242 46.4695C65.0003 47.091 63.7437 47.8518 63.2317 48.1606C62.7197 48.4673 60.8767 49.4844 59.1361 50.4187C57.3954 51.3551 55.2601 52.4529 54.3888 52.8585C53.5176 53.2642 52.4304 53.7788 51.9687 54.0028C51.507 54.2248 50.7121 54.4851 50.2001 54.5799C49.6881 54.6748 48.9342 54.808 48.5246 54.8766C48.115 54.9472 46.985 54.9997 46.0114 54.9956C45.0377 54.9916 43.5316 54.8524 42.6604 54.6849C41.7891 54.5194 40.4078 54.1521 39.5886 53.8716C38.7695 53.5891 38.036 53.359 37.9597 53.359C37.8834 53.359 37.5892 53.2541 37.3081 53.1229C37.027 52.9938 36.7533 52.8727 36.7031 52.8545C36.6528 52.8343 36.4424 52.7476 36.2377 52.6588C36.0329 52.572 35.1951 52.1563 34.376 51.7365C33.4638 51.2683 32.6726 51.0242 32.5888 51.1634C32.4976 51.3168 32.5981 51.5145 32.8029 51.8415C32.9779 52.1199 33.4694 52.6265 33.9106 53.0038C34.3518 53.3812 35.547 54.5073 36.5225 55.5688C37.498 56.6282 38.548 57.9036 38.8552 58.4041C39.1642 58.9046 39.5626 59.7199 39.745 60.2203C39.9331 60.739 40.0392 61.4311 39.9945 61.8348C39.9498 62.2242 39.799 62.8135 39.6594 63.1465C39.5198 63.4794 39.3224 63.8588 39.2182 63.992C39.1158 64.1232 38.4437 64.9304 37.727 65.7861C37.0103 66.6397 34.9308 68.9382 33.1064 70.8937C31.2801 72.8472 29.5376 74.5282 29.3309 74.6936C29.0703 74.9015 28.7389 75.2789 28.5211 75.5574C28.1506 76.0336 27.8825 76.6976 28.052 76.8812C28.2381 77.081 28.523 76.976 28.7817 76.9417C28.9846 76.9135 29.908 76.5623 30.9319 76.0619C31.9558 75.5614 32.7322 75.2183 33.0803 75.0347C33.3484 74.8934 33.9478 74.5786 34.389 74.3607Z";
  const arrowPath = (typeof Path2D !== 'undefined') ? new Path2D(ARROW_D) : null;

  const mask = document.createElement('canvas');
  mask.width = mask.height = TEX;
  const mctx = mask.getContext('2d');
  const K = TEX / SIZE;                        // css px -> texture px

  // shape sizes in css px (of the SIZE canvas)
  const DOT = 4.5;                             // default dot radius
  const RING_OUT = 15;                         // hover ring outer radius (reduced)
  const RING_IN = 10.5;                        // hover ring inner hole
  const AW = 109, AH = 102, TARGET = 64;       // arrow artwork -> css px width
  const ascale0 = (TARGET / AW) * K;

  // animated amounts per state — every shape is rendered liquid-metal by the shader
  const amt = { dot: 1, ring: 0, arrow: 0 };

  function drawShapes(blur) {
    mctx.filter = blur ? 'blur(' + blur + 'px)' : 'none';
    mctx.fillStyle = '#000';
    // default dot
    if (amt.dot > 0.03) {
      mctx.beginPath();
      mctx.arc(TEX / 2, TEX / 2, DOT * amt.dot * K, 0, 2 * Math.PI);
      mctx.fill();
    }
    // hover ring (outer disc minus inner hole)
    if (amt.ring > 0.03) {
      mctx.beginPath();
      mctx.arc(TEX / 2, TEX / 2, RING_OUT * amt.ring * K, 0, 2 * Math.PI);
      mctx.arc(TEX / 2, TEX / 2, RING_IN * amt.ring * K, 0, 2 * Math.PI, true);
      mctx.fill('evenodd');
    }
    // clickable arrow (cursor-03)
    if (amt.arrow > 0.03 && arrowPath) {
      const s = ascale0 * amt.arrow;
      mctx.save();
      mctx.translate((TEX - AW * s) / 2, (TEX - AH * s) / 2);
      mctx.scale(s, s);
      mctx.fill(arrowPath);
      mctx.restore();
    }
  }
  function renderMask() {
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.filter = 'none';
    mctx.fillStyle = '#fff';
    mctx.fillRect(0, 0, TEX, TEX);
    drawShapes(5);                             // soft halo feeds the liquid edge
    drawShapes(1);                             // solid core
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
  }
  renderMask();

  /* the liquid cursor replaces the DOM fallback dot/ring */
  document.body.appendChild(canvas);
  document.body.classList.add('liquid-cursor-on');
  const hideDom = document.createElement('style');
  hideDom.textContent = 'body.liquid-cursor-on .cursor-dot,body.liquid-cursor-on .cursor-ring{display:none!important}';
  document.head.appendChild(hideDom);

  /* ============ frame loop ============ */
  let mx = -200, my = -200, px = -200, py = -200;
  addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });

  let time = 0;
  let last = performance.now();
  const SPEED = reduced ? 0 : 0.3;

  function frame(now) {
    time += (now - last) * SPEED;
    last = now;

    px += (mx - px) * 0.35;
    py += (my - py) * 0.35;
    canvas.style.transform =
      'translate(' + (px - SIZE / 2) + 'px,' + (py - SIZE / 2) + 'px)';

    // state -> shape amounts (dot default · ring on hover · arrow on clickable)
    const view = document.body.classList.contains('cur-view');
    const link = document.body.classList.contains('cur-link');
    const t = { dot: (view || link) ? 0 : 1, ring: (link && !view) ? 1 : 0, arrow: view ? 1 : 0 };
    let ch = false;
    for (const k in amt) { const d = t[k] - amt[k]; if (Math.abs(d) > 0.01) { amt[k] += d * 0.2; ch = true; } }
    if (ch) renderMask();

    gl.uniform1f(U.u_time, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
