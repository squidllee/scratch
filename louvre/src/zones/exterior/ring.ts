import * as THREE from 'three';
import { boxGeo, quadGeo } from '../../core/geom';
import { mat } from '../../core/materials';
import { CARREE, Y, type RunSpec } from './plan';
import { buildRun, FACE_Z } from './facade';
import { exteriorMaterial, ORNAMENT_GOLD, ROOF_ZINC, statueUnit, type InstanceSink } from './parts';
import { pavilionCrown } from './roof';

/**
 * The two pieces of the Sully ring that carry the museum's identity: Lescot's façade in the
 * Cour Carrée and the Pavillon de l'Horloge on the axis.
 */

/**
 * Lescot's wing: three avant-corps with pediments standing proud of the west range, the oldest
 * elevation in the palace (1546–1555). Each is two bays wide, so the seven-bay module of the
 * measured façade reads as 3 + a bay + 3.
 */
export function buildLescot(sink: InstanceSink): THREE.Group {
  const group = new THREE.Group();
  group.name = 'lescot';
  const project = 0.55;
  const width = 2 * 4.42;
  for (let i = 0; i < 3; i++) {
    const centre = 10.5 + i * 8.9;
    const run: RunSpec = {
      id: 'lescot-' + i,
      axis: 'z',
      line: CARREE.ix0 + project,
      from: centre - width / 2,
      to: centre + width / 2,
      out: 1,
      bays: 2,
      style: 'court',
      layer: 'courts',
      noDormers: true,
    };
    const built = buildRun(run, sink);
    group.add(built.group);
    // The pediment: Lescot's three gables over a low attic.
    const frame = built.frame;
    const pedGroup = new THREE.Group();
    pedGroup.matrixAutoUpdate = false;
    pedGroup.matrix.copy(frame.matrix);
    const rise = 2.1;
    const tympanum = new THREE.BufferGeometry();
    tympanum.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-width / 2, 0, 0, width / 2, 0, 0, 0, rise, 0], 3),
    );
    tympanum.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, width, 0, width / 2, rise], 2));
    tympanum.setIndex([0, 1, 2]);
    tympanum.computeVertexNormals();
    const plate = new THREE.Mesh(tympanum, mat('trim.stone-limestone-warm'));
    plate.position.set(0, Y.cornice + 1.15, FACE_Z + project);
    pedGroup.add(plate);
    for (const side of [-1, 1]) {
      const rakeLen = Math.hypot(width / 2, rise);
      const rake = boxGeo(rakeLen, 0.4, 0.5, { skip: ['back', 'bottom'] });
      rake.rotateZ(-side * Math.atan2(rise, width / 2));
      rake.translate((side * width) / 4, Y.cornice + 1.15 + rise / 2, FACE_Z + project);
      pedGroup.add(new THREE.Mesh(rake, mat('trim.stone-limestone-warm')));
    }
    const attic = boxGeo(width, 1.15, 0.5, { skip: ['back', 'bottom'] });
    attic.translate(0, Y.cornice + 0.575, FACE_Z + project - 0.25);
    pedGroup.add(new THREE.Mesh(attic, mat('stone.limestone-warm')));
    group.add(pedGroup);
  }
  return group;
}

/**
 * The Pavillon de l'Horloge: three bays of nine metres on the Cour Napoléon axis, a tall roof over
 * a 21.5 x 16.5 m plate (the measured roof frame), a glazed lantern, the clock at attic level and
 * Sarazin's caryatids beside the top-storey openings. Measured height: about 40 m.
 */
export function buildHorloge(sink: InstanceSink): THREE.Group {
  const group = new THREE.Group();
  group.name = 'horloge';
  const width = 28;
  const project = 0.9;
  const run: RunSpec = {
    id: 'horloge',
    axis: 'z',
    line: CARREE.x0 + project,
    from: -width / 2,
    to: width / 2,
    out: -1,
    bays: 3,
    style: 'court',
    layer: 'courts',
    noDormers: true,
  };
  const built = buildRun(run, sink);
  group.add(built.group);

  // The attic drum, roof and lantern, centred on the pavilion block.
  const block = boxGeo(width, Y.cornice, 23.75);
  block.translate(0, Y.cornice / 2, 23.75 / 2 + project);
  const holder = new THREE.Group();
  holder.matrixAutoUpdate = false;
  holder.matrix.copy(built.frame.matrix);
  holder.add(new THREE.Mesh(block, mat('stone.limestone-warm')));
  const crown = pavilionCrown({ x: width, z: 23.75, top: Y.pavilion });
  const crownMesh = new THREE.Mesh(crown.geo, exteriorMaterial(ROOF_ZINC));
  crownMesh.position.set(0, 0, 23.75 / 2 + project);
  holder.add(crownMesh);
  const attic = new THREE.Mesh(crown.attic, mat('stone.limestone-warm'));
  attic.position.set(0, 0, 23.75 / 2 + project);
  holder.add(attic);

  // The clock: a gilded surround and a dark face, on the attic's outward face.
  const clockZ = FACE_Z + project - 0.5;
  const bezel = new THREE.CylinderGeometry(2.35, 2.35, 0.3, 20, 1, false);
  bezel.rotateX(Math.PI / 2);
  bezel.translate(0, Y.cornice + 3.1, clockZ);
  holder.add(new THREE.Mesh(bezel, exteriorMaterial(ORNAMENT_GOLD)));
  const face = new THREE.CylinderGeometry(2.0, 2.0, 0.1, 20, 1, false);
  face.rotateX(Math.PI / 2);
  face.translate(0, Y.cornice + 3.1, clockZ + 0.14);
  holder.add(new THREE.Mesh(face, mat('marble.noir-marquina')));
  // Two hands, so the clock reads as a clock at a glance.
  for (const [len, ang] of [[1.5, 0.6], [1.0, 2.4]] as Array<[number, number]>) {
    const hand = boxGeo(0.14, len, 0.06, { skip: ['back'] });
    hand.translate(0, len / 2 - 0.1, 0);
    hand.rotateZ(ang);
    hand.translate(0, Y.cornice + 3.1, clockZ + 0.22);
    holder.add(new THREE.Mesh(hand, exteriorMaterial(ORNAMENT_GOLD)));
  }

  // Sarazin's caryatids: four figures under the attic's outward face.
  const caryatid = statueUnit(3.6);
  const caryatidX = CARREE.x0 - project - FACE_Z + 0.35;
  for (const z of [-9.5, -4.6, 4.6, 9.5]) {
    sink.add('caryatid', caryatid, 'trim.stone-limestone-warm', new THREE.Matrix4().makeTranslation(caryatidX, Y.cornice + 0.4, z));
  }

  group.add(holder);

  // The three tall top-storey openings read from the court: a shallow glazed arch on the axis.
  const arch = quadGeo(
    [-4.4, Y.storey3 + 0.6, FACE_Z + 0.02],
    [4.4, Y.storey3 + 0.6, FACE_Z + 0.02],
    [4.4, Y.cornice - 1.2, FACE_Z + 0.02],
    [-4.4, Y.cornice - 1.2, FACE_Z + 0.02],
  );
  const archMesh = new THREE.Mesh(arch, mat('marble.noir-marquina'));
  archMesh.position.set(0, 0, 0);
  built.group.add(archMesh);

  return group;
}
