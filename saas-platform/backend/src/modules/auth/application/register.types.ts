export interface RegisterCommand {
    email: string;
    passwordRaw: string;
    name: string;
    organizationName: string;
}

export interface RegisterResult {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        organizationId: string;
    };
}
