import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getWorkspaceProjectOptions } from '../config/projectRegistry';

export function useWorkspaceProjectOptions() {
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);
  const options = getWorkspaceProjectOptions(currentWorkspace);
  return options.length > 0 ? options : [{ value: currentWorkspace, label: currentWorkspace }];
}
