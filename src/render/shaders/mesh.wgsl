

struct Uniforms {
  mvp: mat4x4f,
  color: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
};

@vertex
fn vs(@location(0) pos: vec3f, @location(1) normal: vec3f) -> VSOut {
  var o: VSOut;
  o.position = u.mvp * vec4f(pos, 1.0);
  o.normal = normal;
  return o;
}

@fragment
fn fs(i: VSOut) -> @location(0) vec4f {
  let light = normalize(vec3f(0.4, 0.8, 0.6));
  let shade = 0.3 + 0.7 * max(dot(normalize(i.normal), light), 0.0);
  return toOutput(vec4f(u.color.rgb * shade, 1.0));
}

