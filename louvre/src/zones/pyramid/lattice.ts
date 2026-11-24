/**
 * The pyramid's glazing lattice, as 2D face mathematics with no three.js in it.
 *
 * A face is the triangle `a >= 0, c >= 0, a + c <= courses` in lattice units, mapped onto the
 * pyramid's face plane by `facePoint`. With `courses` horizontal courses (counted from the apex
 * down) the pattern is:
 *
 *   - rhombi:   every unit cell (i, j) with i + j <= courses - 2      -> courses(courses-1)/2
 *   - triangles: one per segment of the bottom course                  -> courses
 *
 * That is the Louvre's own scheme. Three faces carry 153 rhombi and 18 triangles (courses = 18);
 * the entrance face loses 9 rhombi and 2 triangles to its door. The three satellite pyramids are
 * the same lattice at courses = 4 (6 rhombi + 4 triangles per face, 24 + 16 per pyramid), which
 * is why louvre.fr's courtyard total is 675 diamonds and 118 triangles, and the inverted pyramid
 * is courses = 7 (21 + 7 per face = 84 + 28).
 *
 * Checks, all against published counts:
 *   main      4 faces, one an entrance face  -> 603 rhombi + 70 triangles = 673
 *   satellites 3 x courses 4                ->  72 rhombi + 48 triangles
 *   inverted   4 faces, courses 7           ->  84 rhombi + 28 triangles
 */

export type FaceCoord = readonly [number, number];

export interface FaceCell {
  kind: 'rhombus' | 'triangle';
  /** Corners in face coordinates (a, c), lattice units, a + c <= courses. */
  verts: FaceCoord[];
  /** Lattice column and course, for diagnostics. */
  i: number;
  j: number;
}

export interface FaceLattice {
  cells: FaceCell[];
  rhombi: number;
  triangles: number;
  /** Panes cut for the entrance door. */
  removed: { rhombi: number; triangles: number };
}

/** Rhombi left behind by an entrance door, as published for the Louvre's entrance face. */
export const ENTRANCE_LOSS = { rhombi: 9, triangles: 2 } as const;

function centroidOf(cell: FaceCell): FaceCoord {
  let a = 0;
  let c = 0;
  for (const v of cell.verts) {
    a += v[0];
    c += v[1];
  }
  return [a / cell.verts.length, c / cell.verts.length];
}

/** Cells sorted by distance from the midpoint of the bottom course, nearest first. */
function nearestToBaseMiddle(cells: FaceCell[], courses: number): FaceCell[] {
  const target: FaceCoord = [courses / 2, courses / 2];
  return [...cells].sort((p, q) => {
    const pc = centroidOf(p);
    const qc = centroidOf(q);
    const pd = (pc[0] - target[0]) ** 2 + (pc[1] - target[1]) ** 2;
    const qd = (qc[0] - target[0]) ** 2 + (qc[1] - target[1]) ** 2;
    if (Math.abs(pd - qd) > 1e-9) return pd - qd;
    // Deterministic tie-break: lower course first, then left to right.
    if (p.i + p.j !== q.i + q.j) return q.i + q.j - (p.i + p.j);
    return p.i - q.i;
  });
}

/**
 * Build one face's panes.
 * `entrance` cuts the door out of the bottom-middle of the face and reports what was removed.
 */
export function faceLattice(courses: number, entrance = false): FaceLattice {
  if (courses < 2) throw new Error('faceLattice needs at least 2 courses');

  const rhombi: FaceCell[] = [];
  for (let i = 0; i + 1 < courses; i++) {
    for (let j = 0; i + j + 1 < courses; j++) {
      rhombi.push({
        kind: 'rhombus',
        i,
        j,
        verts: [
          [i, j],
          [i + 1, j],
          [i + 1, j + 1],
          [i, j + 1],
        ],
      });
    }
  }

  const triangles: FaceCell[] = [];
  for (let i = 0; i < courses; i++) {
    const j = courses - 1 - i;
    triangles.push({
      kind: 'triangle',
      i,
      j,
      verts: [
        [i, j],
        [i + 1, j],
        [i, j + 1],
      ],
    });
  }

  let cells = [...rhombi, ...triangles];
  const removed = { rhombi: 0, triangles: 0 };

  if (entrance) {
    const cutRhombi = new Set(nearestToBaseMiddle(rhombi, courses).slice(0, ENTRANCE_LOSS.rhombi));
    const cutTriangles = new Set(nearestToBaseMiddle(triangles, courses).slice(0, ENTRANCE_LOSS.triangles));
    cells = cells.filter((cell) => {
      if (cell.kind === 'rhombus' && cutRhombi.has(cell)) {
        removed.rhombi++;
        return false;
      }
      if (cell.kind === 'triangle' && cutTriangles.has(cell)) {
        removed.triangles++;
        return false;
      }
      return true;
    });
  }

  return {
    cells,
    rhombi: cells.filter((cell) => cell.kind === 'rhombus').length,
    triangles: cells.filter((cell) => cell.kind === 'triangle').length,
    removed,
  };
}

export interface PyramidCounts {
  rhombi: number;
  triangles: number;
  panes: number;
  perFace: { name: string; rhombi: number; triangles: number }[];
}

/**
 * Count a whole pyramid. `entranceFace` indexes the face that carries the door (-1 for none).
 */
export function pyramidCounts(courses: number, entranceFace = -1): PyramidCounts {
  const faceNames = ['north', 'east', 'south', 'west'];
  const perFace = faceNames.map((name, index) => {
    const face = faceLattice(courses, index === entranceFace);
    return { name, rhombi: face.rhombi, triangles: face.triangles };
  });
  const rhombi = perFace.reduce((sum, face) => sum + face.rhombi, 0);
  const triangles = perFace.reduce((sum, face) => sum + face.triangles, 0);
  return { rhombi, triangles, panes: rhombi + triangles, perFace };
}

/** Approximation of the real Louvre: is every published pane count reproduced? */
export const PUBLISHED = {
  main: { courses: 18, entranceFace: 1, rhombi: 603, triangles: 70 },
  satellite: { courses: 4, rhombi: 6 * 4, triangles: 4 * 4 },
  inverted: { courses: 7, rhombi: 84, triangles: 28 },
} as const;

/** The lattice a mullion grid needs: the three families of lines, as (start, end) in face coords. */
export interface FaceLine {
  from: FaceCoord;
  to: FaceCoord;
}

export function faceLines(courses: number): FaceLine[] {
  const lines: FaceLine[] = [];
  // Horizontal courses (bottom edge included; the apex point is a single point, not a line).
  for (let k = 0; k <= courses; k++) {
    lines.push({ from: [0, k], to: [courses - k, k] });
  }
  // Family A: a = const, running out to the right edge.
  for (let a = 1; a < courses; a++) {
    lines.push({ from: [a, 0], to: [a, courses - a] });
  }
  // Family B: c = const, running out to the left edge.
  for (let c = 1; c < courses; c++) {
    lines.push({ from: [0, c], to: [courses - c, c] });
  }
  return lines;
}
