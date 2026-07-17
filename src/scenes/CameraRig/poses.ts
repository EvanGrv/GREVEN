/**
 * Resting camera poses, shared by the CameraRig (idle parallax anchor) and the
 * NeuralTravel controller (arrival target). Home frames the network as the
 * centrepiece; section pages pull back slightly so it becomes a calm backdrop.
 */
export const HOME_POSE = {
  position: [0, 0, 9] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};

export const SECTION_POSE = {
  position: [0, 0, 10.6] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};
