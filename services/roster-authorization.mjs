export function canManageClassroomRoster(classroom, authenticatedTeacherId) {
  return Boolean(
    authenticatedTeacherId &&
      classroom?.homeroomTeacherId === authenticatedTeacherId,
  )
}
