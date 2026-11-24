import * as THREE from 'three';
import { boxGeo } from '../../core/geom';
import { addPart } from '../../core/merge';
import { mat, outdoorMat } from '../../core/materials';
import { arch, column, cornice, wall } from '../../core/builders';

/**
 * Arc du Carrousel: 19 m high, 23 m wide, 7.3 m deep, on the axis 220 m west of the pyramid.
 *
 * A three-arch marble screen — one 6.4 m arch, two 4.3 m side arches, eight Corinthian columns —
 * carrying the bronze quadriga that replaced the Horses of Saint Mark in 1828.
 */

export const ARC = {
  /** Measured: 19 m high, 23 m wide, 7.3 m deep (EN Wikipedia, 63 x 75 x 24 ft). */
  height: 19,
  width: 23,
  depth: 7.3,
  centralArch: { width: 6.0, head: 6.4 },
  /** Height of the arched screen storey, from the plinth to the entablature. */
  screenHeight: 7.6,
  sideArch: { width: 2.7, head: 4.3, at: 7.4 },
  /** Measured: on the axis, 220 m west of the pyramid. */
  position: { x: -220, z: 0 },
} as const;

/** A horse in bronze: body, neck, head, four legs, tail. Boxes, at the scale of a 25 m view. */
function horse(group: THREE.Group, x: number, z: number, yaw: number, material: THREE.Material, scale: number): void {
  const local = new THREE.Group();
  local.position.set(x, 0, z);
  local.rotation.y = yaw;
  local.scale.setScalar(scale);
  const part = (w: number, h: number, d: number, px: number, py: number, pz: number, rz = 0): void => {
    const mesh = new THREE.Mesh(boxGeo(w, h, d), material);
    mesh.position.set(px, py, pz);
    mesh.rotation.z = rz;
    local.add(mesh);
  };
  part(1.55, 0.78, 0.62, 0, 1.32, 0);
  part(0.42, 0.85, 0.4, 0.62, 1.78, 0, -0.5);
  part(0.55, 0.3, 0.3, 0.92, 2.1, 0, -0.15);
  part(0.12, 0.22, 0.1, 0.78, 2.24, 0.1, 0);
  part(0.12, 0.22, 0.1, 0.78, 2.24, -0.1, 0);
  part(0.34, 0.9, 0.16, -0.78, 1.5, 0, 0.5);
  part(0.16, 1.0, 0.16, 0.52, 0.5, 0.22);
  part(0.16, 1.0, 0.16, 0.52, 0.5, -0.22);
  part(0.16, 1.0, 0.16, -0.52, 0.5, 0.22);
  part(0.16, 1.0, 0.16, -0.52, 0.5, -0.22);
  group.add(local);
}

/** The quadriga: four horses abreast behind a chariot with two standing figures. */
function quadriga(group: THREE.Group, y: number): void {
  const bronze = outdoorMat('gold.bronze-tarnished');
  const base = new THREE.Group();
  base.position.y = y;
  group.add(base);

  const plinth = new THREE.Mesh(boxGeo(5.4, 0.5, 2.6), mat('marble.vert-antique'));
  plinth.position.y = 0.25;
  base.add(plinth);

  for (let i = 0; i < 4; i++) {
    horse(base, 1.1, -1.65 + i * 1.1, -0.06 + (i - 1.5) * 0.05, bronze, 1.0);
  }

  const chariot = new THREE.Group();
  chariot.position.set(-1.5, 0.5, 0);
  base.add(chariot);
  const body = new THREE.Mesh(boxGeo(1.9, 0.95, 2.5), bronze);
  body.position.y = 0.85;
  chariot.add(body);
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 14), bronze);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0.2, 0.62, side * 1.24);
    chariot.add(wheel);
    const figure = new THREE.Mesh(boxGeo(0.52, 1.5, 0.42), bronze);
    figure.position.set(-0.1, 2.05, side * 0.62);
    chariot.add(figure);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), bronze);
    head.position.set(-0.1, 2.95, side * 0.62);
    chariot.add(head);
  }
  const rail = new THREE.Mesh(boxGeo(0.16, 1.0, 2.5), bronze);
  rail.position.set(0.9, 1.5, 0);
  chariot.add(rail);
}

export function buildArc(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pyramid/arc-du-carrousel';
  const halfWidth = ARC.width / 2;
  const marble = mat('stone.limestone-pale');

  // Steps.
  for (let i = 0; i < 3; i++) {
    const geo = boxGeo(ARC.width + 2.4 - i * 0.7, 0.26, ARC.depth + 2.0 - i * 0.6);
    geo.translate(0, 0.13 + i * 0.26, 0);
    group.add(new THREE.Mesh(geo, marble));
  }
  const plinthY = 0.78;

  // The screen itself: one wall with three real openings through 7.3 m of depth.
  const screen = new THREE.Mesh(
    wall({
      length: ARC.width,
      height: ARC.screenHeight,
      thickness: ARC.depth,
      openings: [
        { x: 0, width: ARC.centralArch.width, head: ARC.centralArch.head, arched: true },
        { x: -ARC.sideArch.at, width: ARC.sideArch.width, head: ARC.sideArch.head, arched: true },
        { x: ARC.sideArch.at, width: ARC.sideArch.width, head: ARC.sideArch.head, arched: true },
      ],
    }),
    mat('stone.limestone-pale'),
  );
  screen.position.y = plinthY;
  group.add(screen);

  // Archivolts on both faces, and the keystone of the central arch.
  for (const z of [ARC.depth / 2 - 0.02, -ARC.depth / 2 + 0.02]) {
    const rotation = z > 0 ? 0 : Math.PI;
    const faces: Array<[number, number]> = [
      [ARC.centralArch.width, ARC.centralArch.head - ARC.centralArch.width / 2],
      [ARC.sideArch.width, ARC.sideArch.head - ARC.sideArch.width / 2],
    ];
    for (const [span, springY] of faces) {
      const offsets = span === ARC.centralArch.width ? [0] : [-ARC.sideArch.at, ARC.sideArch.at];
      for (const offset of offsets) {
        const band = new THREE.Mesh(arch({ span, band: 0.34, thickness: 0.24 }), mat('stone.limestone-warm'));
        band.position.set(offset, plinthY + springY, z);
        band.rotation.y = rotation;
        group.add(band);
      }
    }
    const keystone = new THREE.Mesh(boxGeo(0.62, 0.9, 0.3), mat('stone.limestone-warm'));
    keystone.position.set(0, plinthY + ARC.centralArch.head - 0.1, z);
    keystone.rotation.y = rotation;
    group.add(keystone);
  }

  // Eight Corinthian columns, standing on the piers, two faces.
  const columnHeight = ARC.screenHeight - 0.1;
  for (const x of [-ARC.sideArch.at - 3.9, -4.5, 4.5, ARC.sideArch.at + 3.9]) {
    for (const z of [ARC.depth / 2 - 0.5, -ARC.depth / 2 + 0.5]) {
      const shaft = new THREE.Mesh(
        column({ height: columnHeight, radius: 0.5, order: 'corinthian', segments: 14 }),
        mat('marble.jaune-bresche'),
      );
      shaft.position.set(x, plinthY, z);
      group.add(shaft);
    }
  }

  // Entablature and its cornice.
  const entablature = new THREE.Mesh(boxGeo(ARC.width + 0.8, 1.7, ARC.depth + 0.5), marble);
  entablature.position.y = plinthY + columnHeight + 0.85;
  group.add(entablature);
  for (const side of [-1, 1]) {
    const corn = cornice({ length: ARC.width + 0.8, height: 0.42, projection: 0.5, dentils: true });
    const mesh = addPart(group, corn, 'stone.limestone-pale');
    mesh.position.set(0, plinthY + columnHeight + 1.7, (side * (ARC.depth + 0.5)) / 2);
    mesh.rotation.y = side > 0 ? 0 : Math.PI;
  }

  // Attic storey with the bronze inscription panel on both faces.
  const atticY = plinthY + columnHeight + 2.12;
  const atticHeight = 2.5;
  const attic = new THREE.Mesh(boxGeo(ARC.width - 0.6, atticHeight, ARC.depth - 0.5), marble);
  attic.position.y = atticY + atticHeight / 2;
  group.add(attic);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(boxGeo(8.4, 1.3, 0.12), outdoorMat('gold.bronze-tarnished'));
    panel.position.set(0, atticY + atticHeight / 2, side * ((ARC.depth - 0.5) / 2 + 0.06));
    group.add(panel);
  }
  const cap = new THREE.Mesh(boxGeo(ARC.width + 0.4, 0.34, ARC.depth + 0.3), marble);
  cap.position.y = atticY + atticHeight + 0.17;
  group.add(cap);
  const cornTop = cornice({ length: ARC.width + 0.4, height: 0.3, projection: 0.38, dentils: false });
  const topMesh = addPart(group, cornTop, 'stone.limestone-pale');
  topMesh.position.y = atticY + atticHeight + 0.34;

  quadriga(group, atticY + atticHeight + 0.34);

  // Statue groups at the foot of the two outer piers.
  for (const side of [-1, 1]) {
    const pedestal = new THREE.Mesh(boxGeo(1.7, 2.1, 1.4), mat('marble.vert-antique'));
    pedestal.position.set(side * (halfWidth - 0.7), plinthY + 1.05, ARC.depth / 2 + 0.55);
    group.add(pedestal);
    const figure = new THREE.Mesh(boxGeo(0.62, 1.7, 0.55), outdoorMat('gold.bronze-tarnished'));
    figure.position.set(side * (halfWidth - 0.7), plinthY + 2.9, ARC.depth / 2 + 0.55);
    group.add(figure);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), outdoorMat('gold.bronze-tarnished'));
    head.position.set(side * (halfWidth - 0.7), plinthY + 3.95, ARC.depth / 2 + 0.55);
    group.add(head);
  }

  group.position.set(ARC.position.x, 0, ARC.position.z);
  group.rotation.y = -Math.PI / 2;
  return group;
}
