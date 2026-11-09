export function staffInvitationMode(djangoApplications, djangoAuth) {
  if (djangoApplications && djangoAuth) return 'django';
  if (!djangoApplications && !djangoAuth) return 'express';
  return 'unavailable';
}
