export interface LoginCommand {
    email: string;
    passwordRaw: string;
}

export interface LoginResult {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        organizationId: string;
    };
}
