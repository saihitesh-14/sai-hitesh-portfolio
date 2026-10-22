/* An original parametric sculpture. Its only clock is the page's scroll position. */
const vertexSource = `
precision highp float;
attribute vec2 aParameter;
uniform float uProgress;
uniform vec2 uViewport;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec2 vParameter;
const float PI = 3.141592653589793;

vec3 centerline(float t) {
  float minorRadius = .385 + .025 * sin(uProgress * PI);
  float ring = 1.02 + minorRadius * cos(3.0 * t);
  return vec3(ring * cos(2.0 * t), ring * sin(2.0 * t), minorRadius * sin(3.0 * t));
}

vec3 surface(vec2 uv) {
  float t = uv.x;
  float v = uv.y;
  vec3 c = centerline(t);
  vec3 tangent = normalize(centerline(t + .0008) - centerline(t - .0008));
  vec3 outward = normalize(cross(tangent, vec3(0.0, 0.0, 1.0)));
  vec3 binormal = normalize(cross(tangent, outward));
  float twist = t + .14 * sin(3.0 * t) + uProgress * .13;
  vec3 n = outward * cos(twist) + binormal * sin(twist);
  vec3 b = -outward * sin(twist) + binormal * cos(twist);
  float groove = 1.0 + .0055 * cos(v * 32.0);
  float radius = (.177 + .012 * sin(3.0 * t + .5)) * groove;
  c += radius * (n * cos(v) + b * sin(v) * .69);
  return c * vec3(1.12, 1.05, 1.0);
}

vec3 pose(vec3 p) {
  float ax = .69 + uProgress * .12;
  float ay = -.33 + uProgress * 1.6;
  float az = -.26 + uProgress * .32;
  p.yz = mat2(cos(ax), sin(ax), -sin(ax), cos(ax)) * p.yz;
  p.xz = mat2(cos(ay), -sin(ay), sin(ay), cos(ay)) * p.xz;
  p.xy = mat2(cos(az), sin(az), -sin(az), cos(az)) * p.xy;
  return p;
}

void main() {
  vec2 uv = aParameter;
  vec3 p = surface(uv);
  vec3 du = surface(uv + vec2(.0008, 0.0)) - surface(uv - vec2(.0008, 0.0));
  vec3 dv = surface(uv + vec2(0.0, .001)) - surface(uv - vec2(0.0, .001));
  vPosition = pose(p);
  vNormal = normalize(pose(normalize(cross(dv, du))));
  vTangent = normalize(pose(du));
  vParameter = uv;
  float shortSide = min(uViewport.x, uViewport.y);
  vec2 fit = vec2(shortSide / uViewport.x, shortSide / uViewport.y) / 1.98;
  // A long product lens gives depth without making the front strand loom.
  float perspective = 5.8 / (5.8 - vPosition.z * .3);
  gl_Position = vec4(vPosition.xy * fit * perspective, -vPosition.z * .18, 1.0);
}
`;

const fragmentSource = `
precision highp float;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec2 vParameter;

// A white photography studio, its softboxes, and narrow neutral reflection flags.
// Everything is procedural, so the sculpture does not download an environment map.
vec3 studio(vec3 r) {
  vec3 low = vec3(.36, .38, .41);
  vec3 high = vec3(.91, .93, .96);
  vec3 light = mix(low, high, smoothstep(-.65, .75, r.y));
  float sideFlag = exp(-pow((r.x + .16) * 4.8, 2.0));
  sideFlag *= smoothstep(-.45, .45, r.z);
  light *= 1.0 - .48 * sideFlag;
  float whiteCard = exp(-pow((r.x - .53) * 8.5, 2.0));
  whiteCard *= smoothstep(-.6, .35, r.z);
  light += vec3(.54, .54, .53) * whiteCard;
  float tallBox = pow(max(dot(r, normalize(vec3(-.8, .65, .7))), 0.0), 20.0);
  float topBox = pow(max(dot(r, normalize(vec3(.3, 1.0, .25))), 0.0), 10.0);
  light += vec3(.62, .61, .59) * tallBox + vec3(.28) * topBox;
  return light;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(vec3(0.0, 0.0, 7.5) - vPosition);
  vec3 reflected = reflect(-view, n);
  vec3 tangent = normalize(vTangent);
  // The broad and narrow samples soften reflections along the brushed direction.
  vec3 environment = studio(reflected) * .62;
  environment += studio(normalize(reflected + tangent * .085)) * .19;
  environment += studio(normalize(reflected - tangent * .085)) * .19;
  float fresnel = pow(1.0 - max(dot(view, n), 0.0), 5.0);
  vec3 silver = mix(vec3(.86, .88, .91), vec3(.98), fresnel);
  vec3 color = environment * silver;
  float key = max(dot(n, normalize(vec3(-.5, .85, 1.0))), 0.0);
  color += vec3(.065) * key;
  // A quiet machining grain; geometry supplies the larger parallel grooves.
  float grain = sin(vParameter.x * 1130.0 + sin(vParameter.y * 53.0) * 2.0);
  color *= 1.0 + grain * .009;
  color = color / (vec3(1.0) + color * .30);
  color = pow(max(color, vec3(0.0)), vec3(.82));
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

/** Create a dependency-free, scroll-driven WebGL sculpture, preserving the SVG on failure. */
export function createSculpture(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  const parent = canvas.closest('.sculpture-wrap');
  const revealFallback = () => {
    canvas.classList.remove('is-ready');
    parent?.classList.remove('has-webgl');
  };
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });
  } catch {
    revealFallback();
    return null;
  }
  if (!gl) {
    revealFallback();
    return null;
  }

  let resources = null;
  let contextLost = false;
  let currentProgress = 0;

  function initialize() {
    const shaders = [];
    let program;
    let parameterBuffer;
    let indexBuffer;
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Shader allocation failed');
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      }
      program = gl.createProgram();
      if (!program) throw new Error('Program allocation failed');
      shaders.forEach(shader => gl.attachShader(program, shader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed');

      const aroundKnot = 256;
      const aroundTube = 128;
      const parameters = new Float32Array((aroundKnot + 1) * (aroundTube + 1) * 2);
      const indices = new Uint16Array(aroundKnot * aroundTube * 6);
      let offset = 0;
      for (let u = 0; u <= aroundKnot; u++) {
        for (let v = 0; v <= aroundTube; v++) {
          parameters[offset++] = u / aroundKnot * Math.PI * 2;
          parameters[offset++] = v / aroundTube * Math.PI * 2;
        }
      }
      offset = 0;
      for (let u = 0; u < aroundKnot; u++) {
        for (let v = 0; v < aroundTube; v++) {
          const a = u * (aroundTube + 1) + v;
          const b = a + aroundTube + 1;
          indices[offset++] = a;
          indices[offset++] = a + 1;
          indices[offset++] = b;
          indices[offset++] = b;
          indices[offset++] = a + 1;
          indices[offset++] = b + 1;
        }
      }
      parameterBuffer = gl.createBuffer();
      indexBuffer = gl.createBuffer();
      if (!parameterBuffer || !indexBuffer) throw new Error('Buffer allocation failed');
      gl.bindBuffer(gl.ARRAY_BUFFER, parameterBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, parameters, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      return {
        program,
        parameterBuffer,
        indexBuffer,
        count: indices.length,
        parameter: gl.getAttribLocation(program, 'aParameter'),
        progress: gl.getUniformLocation(program, 'uProgress'),
        viewport: gl.getUniformLocation(program, 'uViewport'),
      };
    } catch {
      if (program) gl.deleteProgram(program);
      if (parameterBuffer) gl.deleteBuffer(parameterBuffer);
      if (indexBuffer) gl.deleteBuffer(indexBuffer);
      return null;
    } finally {
      shaders.forEach(shader => gl.deleteShader(shader));
    }
  }

  function draw(progress = currentProgress) {
    if (contextLost || !resources || gl.isContextLost()) return;
    currentProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.useProgram(resources.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.parameterBuffer);
    gl.enableVertexAttribArray(resources.parameter);
    gl.vertexAttribPointer(resources.parameter, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resources.indexBuffer);
    gl.uniform1f(resources.progress, currentProgress);
    gl.uniform2f(resources.viewport, width, height);
    gl.drawElements(gl.TRIANGLES, resources.count, gl.UNSIGNED_SHORT, 0);
    if (!gl.isContextLost()) {
      canvas.classList.add('is-ready');
      parent?.classList.add('has-webgl');
    }
  }

  resources = initialize();
  if (!resources) {
    revealFallback();
    return null;
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    resources = null;
    revealFallback();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    resources = initialize();
    if (resources) draw(currentProgress);
    else revealFallback();
  });

  draw(0);
  return { draw };
}
