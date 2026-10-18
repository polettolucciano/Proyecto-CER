import { visibleData } from '../../domain';
import { useApp } from '../../store';

export function useVisibleWorkspace() {
  const { data, user } = useApp();
  return visibleData(data, user);
}

