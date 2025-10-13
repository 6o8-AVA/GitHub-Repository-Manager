import { OrgStatus } from '../../store/organization';


export function getEmptyOrgLabel(status: OrgStatus): string {
  switch (status) {
    case OrgStatus.errorLoading:
      return 'Error loading';
    case OrgStatus.notLoaded:
    case OrgStatus.loading:
      return 'Loading...';
    case OrgStatus.loaded:
      return 'Empty';
    default:
      return '';
  }
}
