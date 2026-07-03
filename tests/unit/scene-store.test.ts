import { beforeEach, describe, expect, it } from 'vitest';
import { useSceneStore } from '@/stores/sceneStore';

describe('sceneStore', () => {
  beforeEach(() => {
    useSceneStore.setState({
      quality: null,
      activeSection: null,
      hoveredSection: null,
      travelRequest: null,
    });
  });

  it('tracks hover and active section independently', () => {
    const { setHoveredSection, setActiveSection } = useSceneStore.getState();
    setHoveredSection('recherche');
    setActiveSection('projets');
    expect(useSceneStore.getState().hoveredSection).toBe('recherche');
    expect(useSceneStore.getState().activeSection).toBe('projets');
  });

  it('increments the travel nonce on every request so repeats re-trigger', () => {
    const { requestTravel } = useSceneStore.getState();
    requestTravel('recherche', [1, 2, 3]);
    const first = useSceneStore.getState().travelRequest;
    requestTravel('recherche', [1, 2, 3]);
    const second = useSceneStore.getState().travelRequest;
    expect(first?.nonce).toBeDefined();
    expect(second?.nonce).toBe((first?.nonce ?? 0) + 1);
    expect(second?.target).toEqual([1, 2, 3]);
  });

  it('mutates the pointer holder in place (no new object per move)', () => {
    const before = useSceneStore.getState().pointer;
    before.x = 0.5;
    before.y = -0.25;
    const after = useSceneStore.getState().pointer;
    expect(after).toBe(before);
    expect(after.x).toBe(0.5);
  });

  it('accepts quality tier changes (the PerformanceMonitor demotion path)', () => {
    const { setQuality } = useSceneStore.getState();
    setQuality('high');
    expect(useSceneStore.getState().quality).toBe('high');
    setQuality('medium');
    expect(useSceneStore.getState().quality).toBe('medium');
  });
});
