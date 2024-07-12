export const isAllowedRol = (role: string) => {
    const allowedRoles = [
        "OWNER",
        "ADMIN",
        "MANAGER_SALES",
        "MANAGER_AREA",
        "MANAGER_PRODUCTION",
        "WEITRESS",
        "CLIENT",
    ];

    return allowedRoles.includes(role);
};
