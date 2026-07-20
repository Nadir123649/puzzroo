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
    linkedProviders: (() => {
      const lp = user.linkedProviders || [];
      if (lp.length > 0) return lp;
      const derived: string[] = [];
      if (user.password) derived.push('email');
      if (user.firebaseProvider) derived.push(user.firebaseProvider);
      if (user.phone) derived.push('phone');
      return derived.length > 0 ? derived : [user.provider || 'email'];
    })(),
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}
