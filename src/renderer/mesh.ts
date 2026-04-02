/**
 * Mesh — a renderable scene node combining Geometry and Material.
 * Extends Node3D to participate in the scene graph hierarchy.
 */

import { Node3D } from '../core/node3d';
import { Geometry } from './geometry';
import { Material } from './material';

export class Mesh extends Node3D {
  geometry: Geometry;
  material: Material;

  constructor(geometry: Geometry, material: Material, name = 'mesh') {
    super(name);
    this.geometry = geometry;
    this.material = material;
  }
}
