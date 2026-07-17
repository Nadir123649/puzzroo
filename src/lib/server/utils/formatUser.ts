export function formatUser(user: any) {
  return {
    id: user._id,
    publicId: user.publicId,
    username: user.username,
    usernameSet: user.usernameSet,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    isSuperUser: user.isSuperUser,
    isVerified: user.isVerified,
    hasPassword: Boolean(user.password),
    provider: user.provider,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}
