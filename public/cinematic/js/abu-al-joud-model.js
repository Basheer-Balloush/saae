import * as THREE from "./three.module.min.js";

window.saaeCreateAbuAlJoudScene = createAbuAlJoudScene;

// All character parts are geometry; the procedural texture supplies woven trim.
export function createAbuAlJoudScene(host, { reducedMotion = false, onActivate }) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.abuAlJoudCanvas = "true";
  host.appendChild(canvas);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const target = new THREE.Vector3(0, 2.08, 0);
  camera.position.set(0, 2.55, 9.3);
  camera.lookAt(target);
  scene.add(new THREE.HemisphereLight(0xd9faff, 0x183942, 2.5));
  const key = new THREE.DirectionalLight(0xfff3e1, 4.2);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x57e4ee, 3);
  rim.position.set(3, 3, -2);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xb7ceff, 1.4);
  fill.position.set(2, 1, 4);
  scene.add(fill);

  const materials = [],
    geometries = [],
    textures = [];
  const mat = (color, roughness = 0.5, metalness = 0.1, extra = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    materials.push(value);
    return value;
  };
  const pearl = mat(0xf3f1e8, 0.26, 0.28);
  const cloth = mat(0xe2d6b8, 0.95, 0);
  const charcoal = mat(0x111e28, 0.85, 0.06);
  const leather = mat(0x15232b, 0.52, 0.18);
  const burgundy = mat(0x641d32, 0.87, 0);
  const gold = mat(0xc5a775, 0.56, 0.4);
  const metal = mat(0x456570, 0.27, 0.8);
  const black = mat(0x020c13, 0.16, 0.55);
  const cyan = new THREE.MeshBasicMaterial({ color: 0x3de6f1, toneMapped: false });
  materials.push(cyan);
  const seam = mat(0x207b87, 0.6, 0.2);
  const pattern = document.createElement("canvas");
  pattern.width = 256;
  pattern.height = 128;
  const ctx = pattern.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#561b30";
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = "#dcc293";
    ctx.lineWidth = 4;
    [8, 18, 110, 120].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    });
    for (let x = -32; x < 288; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 32, 28);
      ctx.lineTo(x + 64, 64);
      ctx.lineTo(x + 32, 100);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 17, 64);
      ctx.lineTo(x + 32, 47);
      ctx.lineTo(x + 47, 64);
      ctx.lineTo(x + 32, 81);
      ctx.closePath();
      ctx.stroke();
    }
  }
  const trimTexture = new THREE.CanvasTexture(pattern);
  trimTexture.colorSpace = THREE.SRGBColorSpace;
  trimTexture.wrapS = THREE.RepeatWrapping;
  trimTexture.repeat.set(3, 1);
  textures.push(trimTexture);
  const trim = mat(0xffffff, 0.82, 0.05, { map: trimTexture });
  const mesh = (parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) => {
    geometries.push(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.scale.set(...scale);
    parent.add(object);
    return object;
  };
  const sphere = (parent, material, position, scale) =>
    mesh(parent, new THREE.SphereGeometry(1, 32, 24), material, position, scale);
  const box = (parent, material, width, height, depth, radius, position) => {
    const shape = new THREE.Shape();
    const x = -width / 2,
      y = -height / 2,
      r = Math.min(radius, width / 2, height / 2);
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: Math.min(0.025, height * 0.2, width * 0.2),
      bevelThickness: Math.min(0.025, depth * 0.4),
      curveSegments: 12,
    });
    geometry.translate(0, 0, -depth / 2);
    return mesh(parent, geometry, material, position);
  };
  const tube = (parent, points, radius, material) =>
    mesh(
      parent,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        24,
        radius,
        8,
        false,
      ),
      material,
    );
  const ring = (parent, radius, thickness, material, position, scale = [1, 1, 1]) =>
    mesh(parent, new THREE.TorusGeometry(radius, thickness, 8, 48), material, position, scale);
  const cylinder = (parent, material, top, bottom, height, position) =>
    mesh(parent, new THREE.CylinderGeometry(top, bottom, height, 48), material, position);
  const group = (parent, position = [0, 0, 0], name = "") => {
    const value = new THREE.Group();
    value.position.set(...position);
    value.name = name;
    parent.add(value);
    return value;
  };
  const root = group(scene, [0, 0, 0], "Abu Al-Joud");
  root.rotation.y = -0.16;
  const body = group(root, [0, 0, 0], "articulated body");

  // Baggy trousers, articulated ankles, and separate sculpted shoes.
  for (const side of [-1, 1]) {
    const leg = group(body, [side * 0.31, 0, 0], side < 0 ? "right leg" : "left leg");
    sphere(leg, charcoal, [0, 0.94, 0], [0.34, 0.67, 0.32]);
    cylinder(leg, leather, 0.2, 0.18, 0.18, [0, 0.4, 0]);
    sphere(leg, metal, [0, 0.34, 0.03], [0.17, 0.18, 0.17]);
    sphere(leg, pearl, [0, 0.18, 0.17], [0.3, 0.2, 0.47]);
    sphere(leg, leather, [0, 0.065, 0.16], [0.3, 0.055, 0.46]);
    tube(
      leg,
      [
        [-0.26, 0.1, 0.32],
        [-0.18, 0.095, 0.55],
        [0, 0.09, 0.61],
        [0.18, 0.095, 0.55],
        [0.26, 0.1, 0.32],
      ],
      0.019,
      cyan,
    );
    ring(leg, 0.092, 0.017, cyan, [side * 0.172, 0.36, 0.03]).rotation.y = Math.PI / 2;
    for (let i = 0; i < 3; i++)
      tube(
        leg,
        [
          [-0.13 + i * 0.12, 1.4, 0.2],
          [-0.16 + i * 0.13, 0.97, 0.3],
          [-0.1 + i * 0.09, 0.58, 0.15],
        ],
        0.012,
        leather,
      );
  }
  sphere(body, charcoal, [0, 1.39, 0], [0.58, 0.3, 0.32]);
  sphere(body, cloth, [0, 2.08, 0], [0.54, 0.68, 0.32]);
  cylinder(body, trim, 0.55, 0.53, 0.24, [0, 1.63, 0]).scale.z = 0.67;
  for (const y of [1.49, 1.77])
    ring(body, 0.55, 0.018, gold, [0, y, 0], [1, 0.67, 1]).rotation.x = Math.PI / 2;
  box(body, trim, 0.23, 0.63, 0.04, 0.025, [-0.41, 1.28, 0.3]).rotation.z = -0.15;
  for (let i = 0; i < 7; i++)
    tube(
      body,
      [
        [-0.53 + i * 0.035, 0.97, 0.3],
        [-0.55 + i * 0.036, 0.81, 0.33],
      ],
      0.008,
      burgundy,
    );
  for (const side of [-1, 1]) {
    sphere(body, leather, [side * 0.39, 2.13, 0.015], [0.21, 0.57, 0.35]).rotation.z = side * 0.04;
    box(body, trim, 0.09, 0.9, 0.03, 0.01, [side * 0.255, 2.15, 0.325]).rotation.z = side * -0.055;
    tube(
      body,
      [
        [side * 0.26, 2.59, 0.31],
        [side * 0.2, 2.3, 0.36],
        [side * 0.23, 1.73, 0.34],
      ],
      0.012,
      gold,
    );
    tube(
      body,
      [
        [side * 0.48, 2.56, 0.24],
        [side * 0.57, 2.24, 0.23],
        [side * 0.51, 1.73, 0.25],
      ],
      0.012,
      gold,
    );
  }
  // Raised mesh strokes form the circuit tree on his shirt.
  const emblem = group(body, [0, 2.18, 0.327], "circuit tree emblem");
  tube(
    emblem,
    [
      [0, -0.24, 0],
      [0, -0.05, 0.018],
      [0, 0.22, 0],
    ],
    0.012,
    seam,
  );
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const y = -0.09 + i * 0.08;
      tube(
        emblem,
        [
          [0, y, 0.01],
          [side * 0.06, y + 0.07, 0.015],
          [side * (0.15 - i * 0.025), y + 0.11, 0],
        ],
        0.008,
        seam,
      );
      sphere(emblem, seam, [side * (0.15 - i * 0.025), y + 0.11, 0], [0.017, 0.017, 0.008]);
    }
    tube(
      emblem,
      [
        [0, -0.18, 0],
        [side * 0.035, -0.24, 0],
        [side * 0.09, -0.26, 0],
      ],
      0.009,
      seam,
    );
  }
  cylinder(body, metal, 0.18, 0.21, 0.27, [0, 2.72, 0]);
  cylinder(body, cyan, 0.19, 0.19, 0.035, [0, 2.76, 0]);

  const head = group(body, [0, 3.39, 0], "head and expression");
  sphere(head, pearl, [0, 0, 0], [0.79, 0.69, 0.61]);
  const face = group(head, [0, 0, 0.11], "face display");
  box(face, metal, 1.24, 0.91, 0.08, 0.36, [0, -0.025, 0.467]);
  box(face, black, 1.16, 0.83, 0.12, 0.34, [0, -0.025, 0.518]);
  tube(
    face,
    [
      [-0.4, 0.3, 0.601],
      [-0.18, 0.358, 0.608],
      [0.06, 0.367, 0.607],
    ],
    0.008,
    metal,
  );
  const eyes = group(face, [0, 0, 0], "blinking eyes");
  for (const side of [-1, 1]) {
    tube(
      eyes,
      [
        [side * 0.25 - 0.12, 0, 0.605],
        [side * 0.25 - 0.08, 0.075, 0.61],
        [side * 0.25, 0.1, 0.612],
        [side * 0.25 + 0.08, 0.075, 0.61],
        [side * 0.25 + 0.12, 0, 0.605],
      ],
      0.035,
      cyan,
    );
    tube(
      face,
      [
        [side * 0.25 - 0.07, 0.21, 0.606],
        [side * 0.25, 0.236, 0.61],
        [side * 0.25 + 0.07, 0.216, 0.606],
      ],
      0.011,
      cyan,
    );
    cylinder(head, metal, 0.28, 0.28, 0.13, [side * 0.77, 0, -0.02]).rotation.z = Math.PI / 2;
    ring(head, 0.23, 0.025, cyan, [side * 0.842, 0, -0.02]).rotation.y = Math.PI / 2;
    cylinder(head, pearl, 0.19, 0.19, 0.02, [side * 0.852, 0, -0.02]).rotation.z = Math.PI / 2;
  }
  tube(
    face,
    [
      [-0.115, -0.19, 0.609],
      [-0.06, -0.235, 0.613],
      [0, -0.245, 0.614],
      [0.07, -0.225, 0.612],
      [0.12, -0.19, 0.609],
    ],
    0.016,
    cyan,
  );
  sphere(head, burgundy, [0, 0.5, -0.04], [0.73, 0.29, 0.55]);
  cylinder(head, trim, 0.695, 0.735, 0.16, [0, 0.505, -0.04]).scale.z = 0.78;
  for (const y of [0.415, 0.597])
    ring(head, y < 0.5 ? 0.735 : 0.695, 0.015, gold, [0, y, -0.04], [1, 0.78, 1]).rotation.x =
      Math.PI / 2;
  box(head, burgundy, 0.29, 1.12, 0.055, 0.06, [-0.57, -0.14, -0.39]).rotation.z = -0.13;
  box(head, trim, 0.13, 0.95, 0.025, 0.01, [-0.6, -0.17, -0.344]).rotation.z = -0.13;

  const makeHand = (parent, raised) => {
    sphere(parent, metal, [0, -0.1, 0], [0.14, 0.17, 0.085]);
    sphere(parent, pearl, [0, -0.09, -0.055], [0.13, 0.15, 0.04]);
    for (let i = 0; i < 4; i++) {
      const x = -0.105 + i * 0.067,
        length = i === 0 || i === 3 ? 0.15 : 0.19;
      const finger = group(parent, [x, -0.2, 0], "finger");
      finger.rotation.z = (i - 1.5) * (raised ? 0.18 : 0.035);
      mesh(finger, new THREE.CapsuleGeometry(0.028, length, 4, 8), metal, [0, -length / 2, 0]);
      sphere(finger, pearl, [0, -length, 0], [0.029, 0.039, 0.03]);
    }
    mesh(
      parent,
      new THREE.CapsuleGeometry(0.036, 0.13, 4, 8),
      metal,
      [-0.16, -0.1, 0.03],
    ).rotation.z = -0.8;
  };
  const shoulder = group(body, [-0.57, 2.48, 0], "waving shoulder");
  shoulder.rotation.z = -0.65;
  sphere(shoulder, metal, [0, 0, 0], [0.18, 0.18, 0.18]);
  sphere(shoulder, cloth, [0, -0.24, 0], [0.205, 0.31, 0.21]);
  const elbow = group(shoulder, [0, -0.48, 0], "waving elbow");
  elbow.rotation.z = -1.72;
  elbow.rotation.x = -0.2;
  sphere(elbow, metal, [0, 0, 0], [0.14, 0.14, 0.14]);
  sphere(elbow, pearl, [0, -0.2, 0], [0.17, 0.25, 0.17]);
  cylinder(elbow, leather, 0.135, 0.135, 0.07, [0, -0.37, 0]);
  cylinder(elbow, cyan, 0.137, 0.137, 0.025, [0, -0.39, 0]);
  const hand = group(elbow, [0, -0.47, 0], "waving wrist");
  makeHand(hand, true);
  const arm = group(body, [0.6, 2.45, 0], "tablet arm");
  arm.rotation.z = 0.14;
  sphere(arm, cloth, [0, -0.2, 0], [0.2, 0.34, 0.2]);
  sphere(arm, metal, [0, -0.48, 0.02], [0.14, 0.14, 0.14]);
  sphere(arm, pearl, [0.015, -0.7, 0.09], [0.155, 0.27, 0.18]);
  const tablet = group(body, [0.7, 1.84, 0.34], "tablet");
  tablet.rotation.set(-0.07, -0.16, 0.14);
  box(tablet, metal, 0.49, 0.8, 0.08, 0.04, [0, 0, 0]);
  box(tablet, black, 0.435, 0.735, 0.014, 0.032, [0, 0, 0.052]);
  box(tablet, seam, 0.36, 0.64, 0.008, 0.02, [0, 0, 0.067]);
  for (let i = 0; i < 4; i++)
    box(tablet, cyan, i === 0 ? 0.23 : 0.28 - i * 0.035, 0.012, 0.005, 0.003, [
      0,
      0.17 - i * 0.09,
      0.078,
    ]);
  sphere(tablet, cyan, [0, -0.3, 0.08], [0.025, 0.025, 0.008]);
  const tabletHand = group(body, [0.79, 1.4, 0.42], "tablet hand");
  tabletHand.rotation.z = Math.PI * 0.65;
  makeHand(tabletHand, false);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x00070a,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  materials.push(shadowMat);
  mesh(
    scene,
    new THREE.CircleGeometry(1, 48),
    shadowMat,
    [0, 0.002, 0],
    [1.18, 0.7, 1],
  ).rotation.x = -Math.PI / 2;
  ring(scene, 1.1, 0.009, seam, [0, 0.006, 0], [1, 0.75, 1]).rotation.x = -Math.PI / 2;

  let disposed = false,
    visible = true,
    inViewport = false,
    frameId = 0,
    lastFrame = 0;
  let yaw = -0.16,
    pitch = 0,
    pointerX = 0,
    pointerY = 0;
  let drag = null,
    waveStart = performance.now(),
    elapsed = 0;
  const render = (now) => {
    frameId = 0;
    if (disposed || !visible || !inViewport || document.hidden) return;
    if (now - lastFrame >= 32) {
      const delta = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      elapsed += delta;
      const blend = 1 - Math.exp(-delta * 8);
      root.rotation.y += (yaw - root.rotation.y) * blend;
      root.rotation.x += (pitch - root.rotation.x) * blend;
      head.rotation.y += (pointerX * 0.21 - head.rotation.y) * blend;
      head.rotation.x += (pointerY * 0.1 - head.rotation.x) * blend;
      const greeting = Math.max(0, 1 - (now - waveStart) / 2400);
      if (!reducedMotion) {
        body.position.y = Math.sin(elapsed * 1.8) * 0.018;
        head.rotation.z = Math.sin(elapsed * 0.8) * 0.028;
        hand.rotation.z = Math.sin((now - waveStart) * 0.012) * greeting * 0.38;
        shoulder.rotation.z = -0.65 - Math.sin((now - waveStart) * 0.008) * greeting * 0.08;
        const blink = elapsed % 5.3;
        eyes.scale.y = blink > 4.95 ? Math.max(0.1, Math.abs(blink - 5.12) / 0.17) : 1;
      }
      renderer.render(scene, camera);
    }
    if (
      !reducedMotion ||
      Math.abs(root.rotation.y - yaw) > 0.001 ||
      Math.abs(root.rotation.x - pitch) > 0.001
    )
      frameId = requestAnimationFrame(render);
  };
  const invalidate = () => {
    if (!disposed && !frameId && visible && inViewport && !document.hidden)
      frameId = requestAnimationFrame(render);
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = Math.max(8.35, 6.3 / camera.aspect);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    invalidate();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting;
    if (!inViewport) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else invalidate();
  });
  observer.observe(host);
  const down = (event) => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, moved: false };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const move = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      yaw = drag.yaw + dx * 0.012;
      pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.003, -0.18, 0.18);
    }
    invalidate();
  };
  const up = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const shouldActivate = !drag.moved;
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = "grab";
    if (shouldActivate) onActivate();
  };
  const cancel = () => {
    drag = null;
    canvas.style.cursor = "grab";
  };
  const leave = () => {
    pointerX = 0;
    pointerY = 0;
    invalidate();
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else invalidate();
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("pointerleave", leave);
  document.addEventListener("visibilitychange", visibility);
  resize();
  return {
    setActive(value) {
      visible = value;
      if (value) invalidate();
      else {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    },
    wave() {
      waveStart = performance.now();
      invalidate();
    },
    reset() {
      yaw = -0.16;
      pitch = 0;
      pointerX = 0;
      pointerY = 0;
      invalidate();
    },
    turn(amount) {
      yaw += amount;
      invalidate();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("pointerleave", leave);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
